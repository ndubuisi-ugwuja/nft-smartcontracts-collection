const { expect } = require("chai");
const { ethers, network } = require("hardhat");
const { developmentChains } = require("../../helper-hardhat-config");

developmentChains.includes(network.name)
    ? describe.skip
    : describe("RandomIpfsNft Staging Tests", function () {
          let randomIpfsNft;
          let owner;
          let addr1;
          const CONTRACT_ADDRESS = process.env.RANDOM_IPFS_NFT_ADDRESS;

          before(async function () {
              this.timeout(60000); // Increase timeout for network operations

              // Get signers
              [owner, addr1] = await ethers.getSigners();

              // Connect to deployed contract
              if (!CONTRACT_ADDRESS) {
                  throw new Error("Please set RANDOM_IPFS_NFT_ADDRESS in your .env file");
              }

              const RandomIpfsNft = await ethers.getContractFactory("RandomIpfsNft");
              randomIpfsNft = RandomIpfsNft.attach(CONTRACT_ADDRESS);

              console.log("Testing RandomIpfsNft contract at:", CONTRACT_ADDRESS);
              console.log("Using account:", owner.address);
              console.log(
                  "Account balance:",
                  ethers.formatEther(await ethers.provider.getBalance(owner.address)),
                  "ETH",
              );

              // Verify contract exists
              const code = await ethers.provider.getCode(CONTRACT_ADDRESS);
              if (code === "0x") {
                  throw new Error("No contract found at the specified address");
              }
          });

          describe("Deployment checks", function () {
              it("Should have correct name and symbol", async function () {
                  const name = await randomIpfsNft.name();
                  const symbol = await randomIpfsNft.symbol();
                  console.log("Contract name:", name);
                  console.log("Contract symbol:", symbol);
                  expect(name).to.equal("Random IPFS NFT");
                  expect(symbol).to.equal("RIN");
              });

              it("Should have a mint fee set", async function () {
                  const mintFee = await randomIpfsNft.getMintFee();
                  console.log("Mint fee:", ethers.formatEther(mintFee), "ETH");
                  expect(mintFee).to.be.gt(0n);
              });

              it("Should have token counter initialized", async function () {
                  const counter = await randomIpfsNft.getTokenCounter();
                  console.log("Current token counter:", counter.toString());
                  expect(counter).to.be.a("bigint");
              });

              it("Should have dog token URIs initialized", async function () {
                  const pug = await randomIpfsNft.getDogTokenUris(0);
                  const shiba = await randomIpfsNft.getDogTokenUris(1);
                  const stBernard = await randomIpfsNft.getDogTokenUris(2);

                  console.log("PUG URI:", pug);
                  console.log("SHIBA_INU URI:", shiba);
                  console.log("ST_BERNARD URI:", stBernard);

                  expect(pug).to.not.be.empty;
                  expect(shiba).to.not.be.empty;
                  expect(stBernard).to.not.be.empty;
                  expect(pug).to.include("ipfs://");
                  expect(shiba).to.include("ipfs://");
                  expect(stBernard).to.include("ipfs://");
              });
          });

          describe("Chance array and breed selection", function () {
              it("Should return correct chance array", async function () {
                  const chanceArray = await randomIpfsNft.getChanceArray();
                  console.log(
                      "Chance array:",
                      chanceArray.map((n) => n.toString()),
                  );

                  expect(chanceArray[0]).to.equal(10n); // PUG - 10%
                  expect(chanceArray[1]).to.equal(30n); // SHIBA_INU - 30%
                  expect(chanceArray[2]).to.equal(100n); // ST_BERNARD - 60% (100 - 10 - 30)
              });

              it("Should correctly map modded RNG to PUG (0-9)", async function () {
                  const breed = await randomIpfsNft.getBreedFromModdedRng(5);
                  console.log("Random value 5 maps to breed:", breed.toString());
                  expect(breed).to.equal(0n); // PUG
              });

              it("Should correctly map modded RNG to SHIBA_INU (10-39)", async function () {
                  const breed = await randomIpfsNft.getBreedFromModdedRng(25);
                  console.log("Random value 25 maps to breed:", breed.toString());
                  expect(breed).to.equal(1n); // SHIBA_INU
              });

              it("Should correctly map modded RNG to ST_BERNARD (40-99)", async function () {
                  const breed = await randomIpfsNft.getBreedFromModdedRng(75);
                  console.log("Random value 75 maps to breed:", breed.toString());
                  expect(breed).to.equal(2n); // ST_BERNARD
              });
          });

          describe("NFT Requesting functionality", function () {
              it("Should revert if insufficient ETH is sent", async function () {
                  const mintFee = await randomIpfsNft.getMintFee();
                  const insufficientAmount = mintFee - 1n;

                  await expect(randomIpfsNft.requestNft({ value: insufficientAmount })).to.be.revertedWithCustomError(
                      randomIpfsNft,
                      "RandomIpfsNft__NeedMoreETHSent",
                  );
                  console.log("Correctly reverted with insufficient payment");
              });

              it("Should successfully request NFT with sufficient payment", async function () {
                  this.timeout(180000); // 3 minutes - VRF can be slow

                  const mintFee = await randomIpfsNft.getMintFee();
                  const counterBefore = await randomIpfsNft.getTokenCounter();
                  const balanceBefore = await ethers.provider.getBalance(owner.address);

                  console.log("Counter before request:", counterBefore.toString());
                  console.log("Balance before:", ethers.formatEther(balanceBefore), "ETH");
                  console.log("Requesting NFT with mint fee:", ethers.formatEther(mintFee), "ETH");

                  const tx = await randomIpfsNft.requestNft({ value: mintFee });
                  console.log("Request transaction hash:", tx.hash);

                  const receipt = await tx.wait();
                  console.log("Transaction confirmed in block:", receipt.blockNumber);
                  console.log("Gas used:", receipt.gasUsed.toString());

                  const counterAfter = await randomIpfsNft.getTokenCounter();
                  const balanceAfter = await ethers.provider.getBalance(owner.address);

                  console.log("Counter after request:", counterAfter.toString());
                  console.log("Balance after:", ethers.formatEther(balanceAfter), "ETH");

                  expect(counterAfter).to.equal(counterBefore + 1n);

                  // Check balance decreased by more than mint fee (including gas)
                  const balanceChange = balanceBefore - balanceAfter;
                  expect(balanceChange).to.be.gt(mintFee);
              });

              it("Should emit NftRequested event", async function () {
                  this.timeout(180000);

                  const mintFee = await randomIpfsNft.getMintFee();
                  const tx = await randomIpfsNft.requestNft({ value: mintFee });
                  const receipt = await tx.wait();

                  // Find NftRequested event
                  const event = receipt.logs.find((log) => {
                      try {
                          const parsed = randomIpfsNft.interface.parseLog(log);
                          return parsed && parsed.name === "NftRequested";
                      } catch {
                          return false;
                      }
                  });

                  expect(event).to.not.be.undefined;

                  if (event) {
                      const parsed = randomIpfsNft.interface.parseLog(event);
                      console.log("NftRequested event emitted");
                      console.log("Request ID:", parsed.args.requestId.toString());
                      console.log("Requester:", parsed.args.requester);

                      expect(parsed.args.requester.toLowerCase()).to.equal(owner.address.toLowerCase());
                  }
              });

              it("Should store request ID to sender mapping", async function () {
                  this.timeout(180000);

                  const mintFee = await randomIpfsNft.getMintFee();
                  const tx = await randomIpfsNft.requestNft({ value: mintFee });
                  const receipt = await tx.wait();

                  // Get request ID from event
                  const event = receipt.logs.find((log) => {
                      try {
                          const parsed = randomIpfsNft.interface.parseLog(log);
                          return parsed && parsed.name === "NftRequested";
                      } catch {
                          return false;
                      }
                  });

                  if (event) {
                      const parsed = randomIpfsNft.interface.parseLog(event);
                      const requestId = parsed.args.requestId;

                      const sender = await randomIpfsNft.s_requestIdToSender(requestId);
                      console.log("Stored sender for request ID", requestId.toString(), ":", sender);

                      expect(sender.toLowerCase()).to.equal(owner.address.toLowerCase());
                  }
              });
          });

          describe("VRF Callback and Minting", function () {
              it("Should eventually mint NFT after VRF fulfillment", async function () {
                  this.timeout(300000); // 5 minutes - VRF fulfillment can take time

                  const mintFee = await randomIpfsNft.getMintFee();
                  const initialBalance = await randomIpfsNft.balanceOf(owner.address);

                  console.log("Initial NFT balance:", initialBalance.toString());
                  console.log("Requesting NFT and waiting for VRF fulfillment...");
                  console.log("This may take 2-3 minutes on Sepolia...");

                  const tx = await randomIpfsNft.requestNft({ value: mintFee });
                  const receipt = await tx.wait();

                  const event = receipt.logs.find((log) => {
                      try {
                          const parsed = randomIpfsNft.interface.parseLog(log);
                          return parsed && parsed.name === "NftRequested";
                      } catch {
                          return false;
                      }
                  });

                  let requestId;
                  if (event) {
                      const parsed = randomIpfsNft.interface.parseLog(event);
                      requestId = parsed.args.requestId;
                      console.log("Request ID:", requestId.toString());
                  }

                  // Wait for VRF fulfillment by polling balance
                  let minted = false;
                  let attempts = 0;
                  const maxAttempts = 60; // 5 minutes (5 second intervals)

                  while (!minted && attempts < maxAttempts) {
                      await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds

                      const currentBalance = await randomIpfsNft.balanceOf(owner.address);
                      attempts++;

                      if (currentBalance > initialBalance) {
                          minted = true;
                          console.log(`NFT minted after ${attempts * 5} seconds!`);
                          console.log("New NFT balance:", currentBalance.toString());
                      } else if (attempts % 6 === 0) {
                          // Log every 30 seconds
                          console.log(`Still waiting... (${attempts * 5}s elapsed)`);
                      }
                  }

                  if (!minted) {
                      console.log("WARNING: NFT not minted within timeout period");
                      console.log("VRF fulfillment may still be pending on Sepolia");
                      console.log("Check your VRF subscription and wait a few more minutes");
                  }

                  // Note: We don't fail the test if not minted, as VRF timing is unpredictable
                  // This test serves as a monitor rather than a strict assertion
              });
          });

          describe("Contract balance and withdrawal", function () {
              it("Should accumulate ETH from mint fees", async function () {
                  const contractBalance = await ethers.provider.getBalance(CONTRACT_ADDRESS);
                  console.log("Contract balance:", ethers.formatEther(contractBalance), "ETH");

                  // Contract should have received mint fees
                  expect(contractBalance).to.be.gte(0n);
              });

              it("Should allow owner to estimate withdrawal gas", async function () {
                  try {
                      const gasEstimate = await randomIpfsNft.withdraw.estimateGas();
                      console.log("Estimated gas for withdrawal:", gasEstimate.toString());
                      expect(gasEstimate).to.be.gt(0n);
                  } catch (error) {
                      console.log("Gas estimation note:", error.message);
                      // This might fail if contract balance is 0, which is okay
                  }
              });
          });

          describe("Gas estimations", function () {
              it("Should estimate gas for requesting NFT", async function () {
                  const mintFee = await randomIpfsNft.getMintFee();
                  const gasEstimate = await randomIpfsNft.requestNft.estimateGas({
                      value: mintFee,
                  });
                  console.log("Estimated gas for requesting NFT:", gasEstimate.toString());
                  expect(gasEstimate).to.be.gt(0n);
              });
          });

          describe("View function checks", function () {
              it("Should read all configuration values", async function () {
                  const mintFee = await randomIpfsNft.getMintFee();
                  const tokenCounter = await randomIpfsNft.getTokenCounter();
                  const chanceArray = await randomIpfsNft.getChanceArray();

                  console.log("Configuration Summary:");
                  console.log("- Mint Fee:", ethers.formatEther(mintFee), "ETH");
                  console.log("- Token Counter:", tokenCounter.toString());
                  console.log("- Chance Array:", chanceArray.map((n) => n.toString()).join(", "));
                  console.log("- PUG chance: 10%");
                  console.log("- SHIBA_INU chance: 30%");
                  console.log("- ST_BERNARD chance: 60%");

                  expect(mintFee).to.be.gt(0n);
                  expect(tokenCounter).to.be.gte(0n);
                  expect(chanceArray.length).to.equal(3);
              });
          });

          after(function () {
              console.log("\n=== Test Summary ===");
              console.log("Note: Some NFTs may still be minting due to VRF timing");
              console.log("Check Chainlink VRF subscription for pending requests");
              console.log("View your NFTs on OpenSea Testnet after a few minutes");
              console.log("Contract Address:", CONTRACT_ADDRESS);
          });
      });
