const { expect } = require("chai");
const { ethers, network } = require("hardhat");
const { developmentChains } = require("../../helper-hardhat-config");
require("dotenv").config();

developmentChains.includes(network.name)
    ? describe.skip
    : describe("DynamicSvgNft Staging Tests", function () {
          let dynamicSvgNft;
          let owner;
          let addr1;
          const CONTRACT_ADDRESS = process.env.DYNAMIC_SVG_NFT_ADDRESS;

          before(async function () {
              this.timeout(60000); // Increase timeout for network operations

              // Get signers
              [owner, addr1] = await ethers.getSigners();

              // Connect to deployed contract
              if (!CONTRACT_ADDRESS) {
                  throw new Error("Please set DYNAMIC_SVG_NFT_ADDRESS in your .env file");
              }

              const DynamicSvgNft = await ethers.getContractFactory("DynamicSvgNft");
              dynamicSvgNft = DynamicSvgNft.attach(CONTRACT_ADDRESS);

              console.log("Testing DynamicSvgNft contract at:", CONTRACT_ADDRESS);
              console.log("Using account:", owner.address);

              // Verify contract exists
              const code = await ethers.provider.getCode(CONTRACT_ADDRESS);
              if (code === "0x") {
                  throw new Error("No contract found at the specified address");
              }
          });

          describe("Deployment checks", function () {
              it("Should have correct name and symbol", async function () {
                  const name = await dynamicSvgNft.name();
                  const symbol = await dynamicSvgNft.symbol();
                  console.log("Contract name:", name);
                  console.log("Contract symbol:", symbol);
                  expect(name).to.equal("Dynamic SVG NFT");
                  expect(symbol).to.equal("DSN");
              });

              it("Should have a valid price feed address", async function () {
                  const priceFeed = await dynamicSvgNft.getPriceFeed();
                  console.log("Price feed address:", priceFeed);
                  expect(priceFeed).to.not.equal(ethers.ZeroAddress);
              });

              it("Should have low and high SVG URIs set", async function () {
                  const lowSVG = await dynamicSvgNft.getLowSVG();
                  const highSVG = await dynamicSvgNft.getHighSVG();

                  console.log("Low SVG URI length:", lowSVG.length);
                  console.log("High SVG URI length:", highSVG.length);

                  expect(lowSVG).to.include("data:image/svg+xml;base64,");
                  expect(highSVG).to.include("data:image/svg+xml;base64,");
                  expect(lowSVG).to.not.equal(highSVG);
              });

              it("Should have a token counter function", async function () {
                  const counter = await dynamicSvgNft.getTokenCounter();
                  console.log("Current token counter:", counter.toString());
                  expect(counter).to.be.a("bigint");
              });
          });

          describe("Price feed functionality", function () {
              it("Should be able to read current price from Chainlink", async function () {
                  const priceFeed = await dynamicSvgNft.getPriceFeed();
                  const aggregator = await ethers.getContractAt("AggregatorV3Interface", priceFeed);

                  const latestRoundData = await aggregator.latestRoundData();
                  const price = latestRoundData[1]; // answer is at index 1

                  console.log("Current price from feed:", ethers.formatUnits(price, 8));
                  expect(price).to.be.gt(0);
              });
          });

          describe("Minting functionality", function () {
              let initialCounter;
              let initialBalance;
              const HIGH_VALUE = ethers.parseUnits("2000", 8); // $2000 with 8 decimals

              before(async function () {
                  initialCounter = await dynamicSvgNft.getTokenCounter();
                  initialBalance = await dynamicSvgNft.balanceOf(owner.address);
                  console.log("Initial token counter:", initialCounter.toString());
                  console.log("Initial balance:", initialBalance.toString());
              });

              it("Should mint NFT with high value and increase counter", async function () {
                  this.timeout(120000); // 2 minutes for minting

                  const counterBefore = await dynamicSvgNft.getTokenCounter();
                  const balanceBefore = await dynamicSvgNft.balanceOf(owner.address);

                  console.log("Counter before mint:", counterBefore.toString());
                  console.log("Balance before mint:", balanceBefore.toString());
                  console.log("High value to set:", ethers.formatUnits(HIGH_VALUE, 8));

                  const tx = await dynamicSvgNft.mintNft(HIGH_VALUE);
                  console.log("Minting transaction hash:", tx.hash);

                  const receipt = await tx.wait();
                  console.log("Transaction confirmed in block:", receipt.blockNumber);
                  console.log("Gas used:", receipt.gasUsed.toString());

                  const counterAfter = await dynamicSvgNft.getTokenCounter();
                  const balanceAfter = await dynamicSvgNft.balanceOf(owner.address);

                  console.log("Counter after mint:", counterAfter.toString());
                  console.log("Balance after mint:", balanceAfter.toString());

                  expect(counterAfter).to.equal(counterBefore + 1n);
                  expect(balanceAfter).to.equal(balanceBefore + 1n);
              });

              it("Should emit CreatedNFT event on mint", async function () {
                  this.timeout(120000);

                  const currentCounter = await dynamicSvgNft.getTokenCounter();
                  const tx = await dynamicSvgNft.mintNft(HIGH_VALUE);
                  const receipt = await tx.wait();

                  // Check for CreatedNFT event
                  const event = receipt.logs.find((log) => {
                      try {
                          const parsed = dynamicSvgNft.interface.parseLog(log);
                          return parsed && parsed.name === "CreatedNFT";
                      } catch {
                          return false;
                      }
                  });

                  expect(event).to.not.be.undefined;
                  console.log("CreatedNFT event found in transaction");
              });

              it("Should verify ownership of newly minted token", async function () {
                  const currentCounter = await dynamicSvgNft.getTokenCounter();
                  const lastTokenId = currentCounter - 1n;

                  console.log("Checking ownership of token ID:", lastTokenId.toString());

                  const tokenOwner = await dynamicSvgNft.ownerOf(lastTokenId);
                  console.log("Token owner:", tokenOwner);
                  console.log("Expected owner:", owner.address);

                  expect(tokenOwner.toLowerCase()).to.equal(owner.address.toLowerCase());
              });

              it("Should store correct high value for minted token", async function () {
                  const currentCounter = await dynamicSvgNft.getTokenCounter();
                  const lastTokenId = currentCounter - 1n;

                  const storedHighValue = await dynamicSvgNft.getTokenIdToHighValue(lastTokenId);
                  console.log("Stored high value:", ethers.formatUnits(storedHighValue, 8));

                  expect(storedHighValue).to.equal(HIGH_VALUE);
              });
          });

          describe("Token URI and metadata", function () {
              let tokenId;

              before(async function () {
                  const currentCounter = await dynamicSvgNft.getTokenCounter();
                  if (currentCounter === 0n) {
                      console.log("No tokens minted yet, minting one for URI tests...");
                      const tx = await dynamicSvgNft.mintNft(ethers.parseUnits("2000", 8));
                      await tx.wait();
                  }
                  tokenId = (await dynamicSvgNft.getTokenCounter()) - 1n;
                  console.log("Testing with token ID:", tokenId.toString());
              });

              it("Should return valid base64 encoded token URI", async function () {
                  const tokenURI = await dynamicSvgNft.tokenURI(tokenId);

                  console.log("Token URI length:", tokenURI.length);
                  expect(tokenURI).to.include("data:application/json;base64,");

                  // Decode and verify JSON structure
                  const base64Data = tokenURI.replace("data:application/json;base64,", "");
                  const jsonString = Buffer.from(base64Data, "base64").toString();
                  const metadata = JSON.parse(jsonString);

                  console.log("Decoded metadata:", metadata);

                  expect(metadata).to.have.property("name");
                  expect(metadata).to.have.property("description");
                  expect(metadata).to.have.property("image");
                  expect(metadata).to.have.property("attributes");
                  expect(metadata.name).to.equal("Dynamic SVG NFT");
              });

              it("Should have valid SVG image in metadata", async function () {
                  const tokenURI = await dynamicSvgNft.tokenURI(tokenId);
                  const base64Data = tokenURI.replace("data:application/json;base64,", "");
                  const jsonString = Buffer.from(base64Data, "base64").toString();
                  const metadata = JSON.parse(jsonString);

                  expect(metadata.image).to.include("data:image/svg+xml;base64,");
                  console.log("Image URI present in metadata");
              });

              it("Should dynamically change image based on price", async function () {
                  // Get current price
                  const priceFeed = await dynamicSvgNft.getPriceFeed();
                  const aggregator = await ethers.getContractAt("AggregatorV3Interface", priceFeed);
                  const latestRoundData = await aggregator.latestRoundData();
                  const currentPrice = latestRoundData[1];

                  // Get token's high value
                  const tokenHighValue = await dynamicSvgNft.getTokenIdToHighValue(tokenId);

                  // Get token URI and decode
                  const tokenURI = await dynamicSvgNft.tokenURI(tokenId);
                  const base64Data = tokenURI.replace("data:application/json;base64,", "");
                  const jsonString = Buffer.from(base64Data, "base64").toString();
                  const metadata = JSON.parse(jsonString);

                  // Get expected SVGs
                  const lowSVG = await dynamicSvgNft.getLowSVG();
                  const highSVG = await dynamicSvgNft.getHighSVG();

                  console.log("Current price:", ethers.formatUnits(currentPrice, 8));
                  console.log("Token high value:", ethers.formatUnits(tokenHighValue, 8));

                  // Verify correct image is shown
                  if (currentPrice >= tokenHighValue) {
                      console.log("Price is HIGH - expecting high SVG");
                      expect(metadata.image).to.equal(highSVG);
                  } else {
                      console.log("Price is LOW - expecting low SVG");
                      expect(metadata.image).to.equal(lowSVG);
                  }
              });
          });

          describe("Gas estimation", function () {
              it("Should estimate gas for minting", async function () {
                  const gasEstimate = await dynamicSvgNft.mintNft.estimateGas(ethers.parseUnits("2000", 8));
                  console.log("Estimated gas for minting:", gasEstimate.toString());
                  expect(gasEstimate).to.be.gt(0n);
              });
          });

          describe("Error handling", function () {
              it("Should revert when querying non-existent token URI", async function () {
                  const nonExistentTokenId = 999999n;

                  await expect(dynamicSvgNft.tokenURI(nonExistentTokenId)).to.be.revertedWithCustomError(
                      dynamicSvgNft,
                      "DynamicSvgNft__NonExistentToken",
                  );
              });
          });
      });
