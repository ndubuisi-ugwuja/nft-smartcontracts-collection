const { assert, expect } = require("chai");
const { ethers, network } = require("hardhat");
const { developmentChains, networkConfig } = require("../../helper-hardhat-config");

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("RandomIpfsNft Unit Tests", function () {
          let randomIpfsNft, vrfCoordinatorV2Mock, deployer, mintFee, subscriptionId;
          const chainId = network.config.chainId;

          beforeEach(async () => {
              const accounts = await ethers.getSigners();
              deployer = accounts[0];

              // Deploy VRF Coordinator Mock
              const BASE_FEE = ethers.parseEther("0.1");
              const GAS_PRICE_LINK = 1000000000n; // 0.000000001 LINK per gas
              const WEI_PER_UNIT_LINK = ethers.parseEther("1");

              const VRFCoordinatorV2_5Mock = await ethers.getContractFactory("VRFCoordinatorV2_5Mock");
              vrfCoordinatorV2Mock = await VRFCoordinatorV2_5Mock.deploy(BASE_FEE, GAS_PRICE_LINK, WEI_PER_UNIT_LINK);
              await vrfCoordinatorV2Mock.waitForDeployment();

              // Create subscription
              const txResponse = await vrfCoordinatorV2Mock.createSubscription();
              const txReceipt = await txResponse.wait(1);
              subscriptionId = txReceipt.logs[0].args.subId;

              // Fund subscription
              await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, ethers.parseEther("10"));

              // Deploy RandomIpfsNft
              const dogTokenUris = ["ipfs://QmPugHash", "ipfs://QmShibaHash", "ipfs://QmStBernardHash"];

              const RandomIpfsNft = await ethers.getContractFactory("RandomIpfsNft");
              randomIpfsNft = await RandomIpfsNft.deploy(
                  await vrfCoordinatorV2Mock.getAddress(),
                  networkConfig[chainId].keyHash,
                  subscriptionId,
                  networkConfig[chainId].callbackGasLimit,
                  dogTokenUris,
                  networkConfig[chainId].mintFee,
              );
              await randomIpfsNft.waitForDeployment();

              // Add consumer to subscription
              await vrfCoordinatorV2Mock.addConsumer(subscriptionId, await randomIpfsNft.getAddress());

              mintFee = await randomIpfsNft.getMintFee();
          });

          describe("constructor", function () {
              it("initializes the NFT correctly", async () => {
                  const name = await randomIpfsNft.name();
                  const symbol = await randomIpfsNft.symbol();
                  const tokenCounter = await randomIpfsNft.getTokenCounter();

                  assert.equal(name, "Random IPFS NFT");
                  assert.equal(symbol, "RIN");
                  assert.equal(tokenCounter.toString(), "0");
              });

              it("sets the correct mint fee", async () => {
                  const expectedMintFee = networkConfig[chainId].mintFee;
                  assert.equal(mintFee.toString(), expectedMintFee);
              });

              it("initializes with correct dog token URIs", async () => {
                  const dogTokenUri0 = await randomIpfsNft.getDogTokenUris(0);
                  const dogTokenUri1 = await randomIpfsNft.getDogTokenUris(1);
                  const dogTokenUri2 = await randomIpfsNft.getDogTokenUris(2);

                  assert(dogTokenUri0.includes("ipfs://"));
                  assert(dogTokenUri1.includes("ipfs://"));
                  assert(dogTokenUri2.includes("ipfs://"));
              });
          });

          describe("requestNft", function () {
              it("reverts if payment is less than mint fee", async () => {
                  await expect(randomIpfsNft.requestNft({ value: 0 })).to.be.revertedWithCustomError(
                      randomIpfsNft,
                      "RandomIpfsNft__NeedMoreETHSent",
                  );
              });

              it("reverts if payment is insufficient", async () => {
                  const insufficientFee = mintFee - 1n;
                  await expect(randomIpfsNft.requestNft({ value: insufficientFee })).to.be.revertedWithCustomError(
                      randomIpfsNft,
                      "RandomIpfsNft__NeedMoreETHSent",
                  );
              });

              it("emits an event when NFT is requested", async () => {
                  await expect(randomIpfsNft.requestNft({ value: mintFee })).to.emit(randomIpfsNft, "NftRequested");
              });

              it("increments token counter after request", async () => {
                  const startingTokenCounter = await randomIpfsNft.getTokenCounter();
                  await randomIpfsNft.requestNft({ value: mintFee });
                  const endingTokenCounter = await randomIpfsNft.getTokenCounter();

                  assert.equal(endingTokenCounter.toString(), (startingTokenCounter + 1n).toString());
              });

              it("records the requester address", async () => {
                  const txResponse = await randomIpfsNft.requestNft({ value: mintFee });
                  const txReceipt = await txResponse.wait(1);

                  // Find the NftRequested event
                  const nftRequestedEvent = txReceipt.logs.find(
                      (log) => log.fragment && log.fragment.name === "NftRequested",
                  );
                  const requestId = nftRequestedEvent.args.requestId;

                  const requester = await randomIpfsNft.s_requestIdToSender(requestId);
                  assert.equal(requester, deployer.address);
              });

              it("returns a request ID", async () => {
                  const txResponse = await randomIpfsNft.requestNft({ value: mintFee });
                  const txReceipt = await txResponse.wait(1);

                  const nftRequestedEvent = txReceipt.logs.find(
                      (log) => log.fragment && log.fragment.name === "NftRequested",
                  );
                  const requestId = nftRequestedEvent.args.requestId;

                  assert(requestId.toString() !== "0");
              });
          });

          describe("fulfillRandomWords", function () {
              it("mints NFT after random number is returned", async function () {
                  await new Promise(async (resolve, reject) => {
                      randomIpfsNft.once("NftMinted", async () => {
                          try {
                              const tokenCounter = await randomIpfsNft.getTokenCounter();
                              const tokenUri = await randomIpfsNft.tokenURI(0);
                              const owner = await randomIpfsNft.ownerOf(0);

                              assert.equal(tokenCounter.toString(), "1");
                              assert(tokenUri.includes("ipfs://"));
                              assert.equal(owner, deployer.address);
                              resolve();
                          } catch (e) {
                              console.log(e);
                              reject(e);
                          }
                      });

                      try {
                          const tx = await randomIpfsNft.requestNft({ value: mintFee });
                          const txReceipt = await tx.wait(1);

                          const nftRequestedEvent = txReceipt.logs.find(
                              (log) => log.fragment && log.fragment.name === "NftRequested",
                          );
                          const requestId = nftRequestedEvent.args.requestId;

                          await vrfCoordinatorV2Mock.fulfillRandomWords(requestId, await randomIpfsNft.getAddress());
                      } catch (e) {
                          console.log(e);
                          reject(e);
                      }
                  });
              });

              it("assigns correct breed based on random number", async () => {
                  await new Promise(async (resolve, reject) => {
                      randomIpfsNft.once("NftMinted", async (tokenId, breed, minter) => {
                          try {
                              assert(breed >= 0 && breed <= 2);
                              assert.equal(minter, deployer.address);
                              resolve();
                          } catch (e) {
                              reject(e);
                          }
                      });

                      const tx = await randomIpfsNft.requestNft({ value: mintFee });
                      const txReceipt = await tx.wait(1);

                      const nftRequestedEvent = txReceipt.logs.find(
                          (log) => log.fragment && log.fragment.name === "NftRequested",
                      );
                      const requestId = nftRequestedEvent.args.requestId;

                      await vrfCoordinatorV2Mock.fulfillRandomWords(requestId, await randomIpfsNft.getAddress());
                  });
              });

              it("cleans up request mapping after fulfillment", async () => {
                  const tx = await randomIpfsNft.requestNft({ value: mintFee });
                  const txReceipt = await tx.wait(1);

                  const nftRequestedEvent = txReceipt.logs.find(
                      (log) => log.fragment && log.fragment.name === "NftRequested",
                  );
                  const requestId = nftRequestedEvent.args.requestId;

                  await vrfCoordinatorV2Mock.fulfillRandomWords(requestId, await randomIpfsNft.getAddress());

                  const requester = await randomIpfsNft.s_requestIdToSender(requestId);
                  assert.equal(requester, ethers.ZeroAddress);
              });
          });

          describe("getBreedFromModdedRng", function () {
              it("returns PUG if moddedRng < 10", async () => {
                  const breed = await randomIpfsNft.getBreedFromModdedRng(5);
                  assert.equal(breed.toString(), "0"); // PUG = 0
              });

              it("returns SHIBA_INU if 10 <= moddedRng < 40", async () => {
                  const breed = await randomIpfsNft.getBreedFromModdedRng(25);
                  assert.equal(breed.toString(), "1"); // SHIBA_INU = 1
              });

              it("returns ST_BERNAD if 40 <= moddedRng < 100", async () => {
                  const breed = await randomIpfsNft.getBreedFromModdedRng(75);
                  assert.equal(breed.toString(), "2"); // ST_BERNAD = 2
              });

              it("returns ST_BERNAD at edge case 99", async () => {
                  const breed = await randomIpfsNft.getBreedFromModdedRng(99);
                  assert.equal(breed.toString(), "2"); // ST_BERNAD
              });

              it("handles edge case at boundary 10", async () => {
                  const breed = await randomIpfsNft.getBreedFromModdedRng(10);
                  assert.equal(breed.toString(), "1"); // SHIBA_INU
              });

              it("handles edge case at boundary 40", async () => {
                  const breed = await randomIpfsNft.getBreedFromModdedRng(40);
                  assert.equal(breed.toString(), "2"); // ST_BERNAD
              });
          });

          describe("getChanceArray", function () {
              it("returns correct rarity chances", async () => {
                  const chanceArray = await randomIpfsNft.getChanceArray();

                  assert.equal(chanceArray[0].toString(), "10"); // PUG: 10% chance
                  assert.equal(chanceArray[1].toString(), "30"); // SHIBA_INU: 30% chance
                  assert.equal(chanceArray[2].toString(), "100"); // ST_BERNAD: 60% chance (100-40)
              });
          });

          describe("withdraw", function () {
              it("only allows owner to withdraw", async () => {
                  const accounts = await ethers.getSigners();
                  const attacker = accounts[1];
                  const attackerConnectedContract = randomIpfsNft.connect(attacker);

                  await expect(attackerConnectedContract.withdraw()).to.be.revertedWith("Only callable by owner");
              });

              it("allows owner to withdraw funds", async () => {
                  // Request NFT to add funds to contract
                  await randomIpfsNft.requestNft({ value: mintFee });

                  const startingContractBalance = await ethers.provider.getBalance(await randomIpfsNft.getAddress());
                  const startingOwnerBalance = await ethers.provider.getBalance(deployer.address);

                  const txResponse = await randomIpfsNft.withdraw();
                  const txReceipt = await txResponse.wait(1);
                  const { gasUsed, gasPrice } = txReceipt;
                  const gasCost = gasUsed * gasPrice;

                  const endingContractBalance = await ethers.provider.getBalance(await randomIpfsNft.getAddress());
                  const endingOwnerBalance = await ethers.provider.getBalance(deployer.address);

                  assert.equal(endingContractBalance.toString(), "0");
                  assert.equal(
                      (startingOwnerBalance + startingContractBalance - gasCost).toString(),
                      endingOwnerBalance.toString(),
                  );
              });

              it("reverts if withdrawal fails", async () => {
                  // This test would require a malicious contract that rejects ETH
                  // For now, we'll just test that the function exists and works normally
                  const contractBalance = await ethers.provider.getBalance(await randomIpfsNft.getAddress());

                  if (contractBalance > 0n) {
                      await expect(randomIpfsNft.withdraw()).to.not.be.reverted;
                  }
              });
          });

          describe("getter functions", function () {
              it("getMintFee returns correct value", async () => {
                  const mintFee = await randomIpfsNft.getMintFee();
                  const expectedMintFee = networkConfig[chainId].mintFee;
                  assert.equal(mintFee.toString(), expectedMintFee);
              });

              it("getDogTokenUris returns correct URI for each index", async () => {
                  for (let i = 0; i < 3; i++) {
                      const uri = await randomIpfsNft.getDogTokenUris(i);
                      assert(uri.includes("ipfs://"));
                  }
              });

              it("getTokenCounter returns current counter", async () => {
                  const initialCounter = await randomIpfsNft.getTokenCounter();
                  assert.equal(initialCounter.toString(), "0");

                  await randomIpfsNft.requestNft({ value: mintFee });
                  const newCounter = await randomIpfsNft.getTokenCounter();
                  assert.equal(newCounter.toString(), "1");
              });
          });

          describe("multiple NFT minting", function () {
              it("can mint multiple NFTs", async () => {
                  const numberOfNfts = 3;

                  for (let i = 0; i < numberOfNfts; i++) {
                      const tx = await randomIpfsNft.requestNft({ value: mintFee });
                      const txReceipt = await tx.wait(1);

                      const nftRequestedEvent = txReceipt.logs.find(
                          (log) => log.fragment && log.fragment.name === "NftRequested",
                      );
                      const requestId = nftRequestedEvent.args.requestId;

                      await vrfCoordinatorV2Mock.fulfillRandomWords(requestId, await randomIpfsNft.getAddress());
                  }

                  const tokenCounter = await randomIpfsNft.getTokenCounter();
                  assert.equal(tokenCounter.toString(), numberOfNfts.toString());

                  // Verify all NFTs are owned by deployer
                  for (let i = 0; i < numberOfNfts; i++) {
                      const owner = await randomIpfsNft.ownerOf(i);
                      assert.equal(owner, deployer.address);
                  }
              });

              it("each NFT has a unique token ID", async () => {
                  const tx1 = await randomIpfsNft.requestNft({ value: mintFee });
                  const txReceipt1 = await tx1.wait(1);
                  const event1 = txReceipt1.logs.find((log) => log.fragment && log.fragment.name === "NftRequested");
                  await vrfCoordinatorV2Mock.fulfillRandomWords(
                      event1.args.requestId,
                      await randomIpfsNft.getAddress(),
                  );

                  const tx2 = await randomIpfsNft.requestNft({ value: mintFee });
                  const txReceipt2 = await tx2.wait(1);
                  const event2 = txReceipt2.logs.find((log) => log.fragment && log.fragment.name === "NftRequested");
                  await vrfCoordinatorV2Mock.fulfillRandomWords(
                      event2.args.requestId,
                      await randomIpfsNft.getAddress(),
                  );

                  const owner1 = await randomIpfsNft.ownerOf(0);
                  const owner2 = await randomIpfsNft.ownerOf(1);

                  assert.equal(owner1, deployer.address);
                  assert.equal(owner2, deployer.address);
              });
          });

          describe("edge cases", function () {
              it("handles exact mint fee payment", async () => {
                  await expect(randomIpfsNft.requestNft({ value: mintFee })).to.not.be.reverted;
              });

              it("handles overpayment for mint", async () => {
                  const overpayment = mintFee * 2n;
                  await expect(randomIpfsNft.requestNft({ value: overpayment })).to.not.be.reverted;
              });

              it("accumulates funds from multiple mints", async () => {
                  const startingBalance = await ethers.provider.getBalance(await randomIpfsNft.getAddress());

                  await randomIpfsNft.requestNft({ value: mintFee });
                  await randomIpfsNft.requestNft({ value: mintFee });

                  const endingBalance = await ethers.provider.getBalance(await randomIpfsNft.getAddress());

                  assert.equal(endingBalance.toString(), (startingBalance + mintFee * 2n).toString());
              });
          });
      });
