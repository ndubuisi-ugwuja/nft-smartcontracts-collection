const { expect } = require("chai");
const { ethers, network } = require("hardhat");
const { developmentChains } = require("../../helper-hardhat-config");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const fs = require("fs");
const path = require("path");

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("DynamicSvgNft", function () {
          const lowSvgPath = path.join(__dirname, "../../images/dynamicNft/frown.svg");
          const highSvgPath = path.join(__dirname, "../../images/dynamicNft/happy.svg");

          if (!fs.existsSync(lowSvgPath)) {
              throw new Error(`Low SVG file not found at ${lowSvgPath}`);
          }
          if (!fs.existsSync(highSvgPath)) {
              throw new Error(`High SVG file not found at ${highSvgPath}`);
          }

          const lowSvg = fs.readFileSync(lowSvgPath, { encoding: "utf8" });
          const highSvg = fs.readFileSync(highSvgPath, { encoding: "utf8" });

          // Helper function to decode base64 JSON from tokenURI
          function decodeTokenURI(tokenURI) {
              const base64Data = tokenURI.split(",")[1];
              const jsonString = Buffer.from(base64Data, "base64").toString("utf-8");
              return JSON.parse(jsonString);
          }

          // Fixture for deploying contracts
          async function deployDynamicSvgNftFixture() {
              const [owner, addr1, addr2] = await ethers.getSigners();

              // Deploy Mock Price Feed
              const MockV3Aggregator = await ethers.getContractFactory("MockV3Aggregator");
              const DECIMALS = 8;
              // 2000 * 10^8
              const INITIAL_PRICE = 2000_00000000;
              const mockPriceFeed = await MockV3Aggregator.deploy(DECIMALS, INITIAL_PRICE);

              // Deploy DynamicSvgNft
              const DynamicSvgNft = await ethers.getContractFactory("DynamicSvgNft");
              const dynamicSvgNft = await DynamicSvgNft.deploy(await mockPriceFeed.getAddress(), lowSvg, highSvg);

              return { dynamicSvgNft, mockPriceFeed, owner, addr1, addr2, INITIAL_PRICE };
          }

          describe("Deployment", function () {
              it("Should set the correct name and symbol", async function () {
                  const { dynamicSvgNft } = await loadFixture(deployDynamicSvgNftFixture);

                  expect(await dynamicSvgNft.name()).to.equal("Dynamic SVG NFT");
                  expect(await dynamicSvgNft.symbol()).to.equal("DSN");
              });

              it("Should set the correct owner", async function () {
                  const { dynamicSvgNft, owner } = await loadFixture(deployDynamicSvgNftFixture);

                  expect(await dynamicSvgNft.owner()).to.equal(owner.address);
              });

              it("Should initialize token counter to 0", async function () {
                  const { dynamicSvgNft } = await loadFixture(deployDynamicSvgNftFixture);

                  expect(await dynamicSvgNft.getTokenCounter()).to.equal(0);
              });

              it("Should set the correct price feed address", async function () {
                  const { dynamicSvgNft, mockPriceFeed } = await loadFixture(deployDynamicSvgNftFixture);

                  expect(await dynamicSvgNft.getPriceFeed()).to.equal(await mockPriceFeed.getAddress());
              });

              it("Should correctly encode low and high SVG images", async function () {
                  const { dynamicSvgNft } = await loadFixture(deployDynamicSvgNftFixture);

                  const lowSvgURI = await dynamicSvgNft.getLowSVG();
                  const highSvgURI = await dynamicSvgNft.getHighSVG();

                  expect(lowSvgURI).to.include("data:image/svg+xml;base64,");
                  expect(highSvgURI).to.include("data:image/svg+xml;base64,");
              });

              it("Should revert if price feed address is zero address", async function () {
                  const DynamicSvgNft = await ethers.getContractFactory("DynamicSvgNft");

                  await expect(DynamicSvgNft.deploy(ethers.ZeroAddress, lowSvg, highSvg)).to.be.revertedWithCustomError(
                      DynamicSvgNft,
                      "DynamicSvgNft__InvalidPriceFeed",
                  );
              });
          });

          describe("Minting", function () {
              it("Should mint a new NFT with correct tokenId", async function () {
                  const { dynamicSvgNft, owner } = await loadFixture(deployDynamicSvgNftFixture);
                  const highValue = 3000_00000000; // $3000

                  await dynamicSvgNft.mintNft(highValue);

                  expect(await dynamicSvgNft.ownerOf(0)).to.equal(owner.address);
                  expect(await dynamicSvgNft.getTokenCounter()).to.equal(1);
              });

              it("Should increment token counter after each mint", async function () {
                  const { dynamicSvgNft } = await loadFixture(deployDynamicSvgNftFixture);

                  await dynamicSvgNft.mintNft(3000_00000000);
                  expect(await dynamicSvgNft.getTokenCounter()).to.equal(1);

                  await dynamicSvgNft.mintNft(2500_00000000);
                  expect(await dynamicSvgNft.getTokenCounter()).to.equal(2);

                  await dynamicSvgNft.mintNft(3500_00000000);
                  expect(await dynamicSvgNft.getTokenCounter()).to.equal(3);
              });

              it("Should store the high value for each token", async function () {
                  const { dynamicSvgNft } = await loadFixture(deployDynamicSvgNftFixture);
                  const highValue1 = 3000_00000000;
                  const highValue2 = 2500_00000000;

                  await dynamicSvgNft.mintNft(highValue1);
                  await dynamicSvgNft.mintNft(highValue2);

                  expect(await dynamicSvgNft.getTokenIdToHighValue(0)).to.equal(highValue1);
                  expect(await dynamicSvgNft.getTokenIdToHighValue(1)).to.equal(highValue2);
              });

              it("Should emit CreatedNFT event", async function () {
                  const { dynamicSvgNft } = await loadFixture(deployDynamicSvgNftFixture);
                  const highValue = 3000_00000000;

                  await expect(dynamicSvgNft.mintNft(highValue))
                      .to.emit(dynamicSvgNft, "CreatedNFT")
                      .withArgs(0, highValue);
              });

              it("Should allow different users to mint", async function () {
                  const { dynamicSvgNft, addr1, addr2 } = await loadFixture(deployDynamicSvgNftFixture);

                  await dynamicSvgNft.connect(addr1).mintNft(3000_00000000);
                  await dynamicSvgNft.connect(addr2).mintNft(2500_00000000);

                  expect(await dynamicSvgNft.ownerOf(0)).to.equal(addr1.address);
                  expect(await dynamicSvgNft.ownerOf(1)).to.equal(addr2.address);
              });
          });

          describe("Token URI and Dynamic Images", function () {
              it("Should return low image when price is below threshold", async function () {
                  const { dynamicSvgNft, mockPriceFeed } = await loadFixture(deployDynamicSvgNftFixture);
                  const highValue = 3000_00000000; // $3000

                  // Current price is $2000, below threshold
                  await dynamicSvgNft.mintNft(highValue);

                  const tokenURI = await dynamicSvgNft.tokenURI(0);
                  const metadata = decodeTokenURI(tokenURI);
                  const lowImageURI = await dynamicSvgNft.getLowSVG();

                  expect(metadata.image).to.equal(lowImageURI);
              });

              it("Should return high image when price equals threshold", async function () {
                  const { dynamicSvgNft, mockPriceFeed } = await loadFixture(deployDynamicSvgNftFixture);
                  const highValue = 2000_00000000; // $2000 (same as current price)

                  await dynamicSvgNft.mintNft(highValue);

                  const tokenURI = await dynamicSvgNft.tokenURI(0);
                  const metadata = decodeTokenURI(tokenURI);
                  const highImageURI = await dynamicSvgNft.getHighSVG();

                  expect(metadata.image).to.equal(highImageURI);
              });

              it("Should return high image when price is above threshold", async function () {
                  const { dynamicSvgNft, mockPriceFeed } = await loadFixture(deployDynamicSvgNftFixture);
                  const highValue = 1500_00000000; // $1500

                  // Current price is $2000, above threshold
                  await dynamicSvgNft.mintNft(highValue);

                  const tokenURI = await dynamicSvgNft.tokenURI(0);
                  const metadata = decodeTokenURI(tokenURI);
                  const highImageURI = await dynamicSvgNft.getHighSVG();

                  expect(metadata.image).to.equal(highImageURI);
              });

              it("Should change image when price changes", async function () {
                  const { dynamicSvgNft, mockPriceFeed } = await loadFixture(deployDynamicSvgNftFixture);
                  const highValue = 2500_00000000; // $2500

                  await dynamicSvgNft.mintNft(highValue);

                  // Initial price is $2000 (low image)
                  let tokenURI = await dynamicSvgNft.tokenURI(0);
                  let metadata = decodeTokenURI(tokenURI);
                  const lowImageURI = await dynamicSvgNft.getLowSVG();
                  expect(metadata.image).to.equal(lowImageURI);

                  // Update price to $3000 (high image)
                  await mockPriceFeed.updateAnswer(3000_00000000);

                  tokenURI = await dynamicSvgNft.tokenURI(0);
                  metadata = decodeTokenURI(tokenURI);
                  const highImageURI = await dynamicSvgNft.getHighSVG();
                  expect(metadata.image).to.equal(highImageURI);
              });

              it("Should have correct metadata structure", async function () {
                  const { dynamicSvgNft } = await loadFixture(deployDynamicSvgNftFixture);

                  await dynamicSvgNft.mintNft(3000_00000000);

                  const tokenURI = await dynamicSvgNft.tokenURI(0);
                  const metadata = decodeTokenURI(tokenURI);

                  expect(metadata).to.have.property("name", "Dynamic SVG NFT");
                  expect(metadata).to.have.property("description");
                  expect(metadata).to.have.property("attributes");
                  expect(metadata).to.have.property("image");
                  expect(metadata.attributes).to.be.an("array").with.lengthOf(1);
                  expect(metadata.attributes[0]).to.deep.equal({
                      trait_type: "coolness",
                      value: 100,
                  });
              });

              it("Should revert when querying tokenURI for non-existent token", async function () {
                  const { dynamicSvgNft } = await loadFixture(deployDynamicSvgNftFixture);

                  await expect(dynamicSvgNft.tokenURI(999)).to.be.revertedWithCustomError(
                      dynamicSvgNft,
                      "DynamicSvgNft__NonExistentToken",
                  );
              });

              it("Should return correct tokenURI format", async function () {
                  const { dynamicSvgNft } = await loadFixture(deployDynamicSvgNftFixture);

                  await dynamicSvgNft.mintNft(3000_00000000);

                  const tokenURI = await dynamicSvgNft.tokenURI(0);

                  expect(tokenURI).to.match(/^data:application\/json;base64,/);
              });
          });

          describe("Helper Functions", function () {
              it("Should correctly convert SVG to base64 image URI", async function () {
                  const { dynamicSvgNft } = await loadFixture(deployDynamicSvgNftFixture);
                  const testSvg = "<svg>test</svg>";

                  const imageURI = await dynamicSvgNft.svgToImageURI(testSvg);

                  expect(imageURI).to.include("data:image/svg+xml;base64,");

                  // Decode and verify
                  const base64Data = imageURI.split(",")[1];
                  const decodedSvg = Buffer.from(base64Data, "base64").toString("utf-8");
                  expect(decodedSvg).to.equal(testSvg);
              });

              it("Should return correct low SVG URI", async function () {
                  const { dynamicSvgNft } = await loadFixture(deployDynamicSvgNftFixture);

                  const lowSvgURI = await dynamicSvgNft.getLowSVG();
                  const base64Data = lowSvgURI.split(",")[1];
                  const decodedSvg = Buffer.from(base64Data, "base64").toString("utf-8");

                  expect(decodedSvg).to.equal(lowSvg);
              });

              it("Should return correct high SVG URI", async function () {
                  const { dynamicSvgNft } = await loadFixture(deployDynamicSvgNftFixture);

                  const highSvgURI = await dynamicSvgNft.getHighSVG();
                  const base64Data = highSvgURI.split(",")[1];
                  const decodedSvg = Buffer.from(base64Data, "base64").toString("utf-8");

                  expect(decodedSvg).to.equal(highSvg);
              });
          });

          describe("Price Feed Integration", function () {
              it("Should correctly read price from mock aggregator", async function () {
                  const { dynamicSvgNft, mockPriceFeed, INITIAL_PRICE } = await loadFixture(deployDynamicSvgNftFixture);

                  const priceFeed = await dynamicSvgNft.getPriceFeed();
                  const MockV3Aggregator = await ethers.getContractAt("MockV3Aggregator", priceFeed);

                  const roundData = await MockV3Aggregator.latestRoundData();
                  expect(roundData[1]).to.equal(INITIAL_PRICE);
              });

              it("Should respond to price feed updates", async function () {
                  const { dynamicSvgNft, mockPriceFeed } = await loadFixture(deployDynamicSvgNftFixture);
                  const highValue = 2500_00000000;

                  await dynamicSvgNft.mintNft(highValue);

                  // Price starts at $2000 (low image)
                  let tokenURI = await dynamicSvgNft.tokenURI(0);
                  let metadata = decodeTokenURI(tokenURI);
                  let lowImageURI = await dynamicSvgNft.getLowSVG();
                  expect(metadata.image).to.equal(lowImageURI);

                  // Update to $2600 (high image)
                  await mockPriceFeed.updateAnswer(2600_00000000);
                  tokenURI = await dynamicSvgNft.tokenURI(0);
                  metadata = decodeTokenURI(tokenURI);
                  let highImageURI = await dynamicSvgNft.getHighSVG();
                  expect(metadata.image).to.equal(highImageURI);

                  // Update back to $2000 (low image again)
                  await mockPriceFeed.updateAnswer(2000_00000000);
                  tokenURI = await dynamicSvgNft.tokenURI(0);
                  metadata = decodeTokenURI(tokenURI);
                  expect(metadata.image).to.equal(lowImageURI);
              });
          });

          describe("ERC721 Standard Compliance", function () {
              it("Should support ERC721 interface", async function () {
                  const { dynamicSvgNft } = await loadFixture(deployDynamicSvgNftFixture);

                  // ERC721 interface ID
                  const ERC721_INTERFACE_ID = "0x80ac58cd";
                  expect(await dynamicSvgNft.supportsInterface(ERC721_INTERFACE_ID)).to.be.true;
              });

              it("Should allow token transfers", async function () {
                  const { dynamicSvgNft, owner, addr1 } = await loadFixture(deployDynamicSvgNftFixture);

                  await dynamicSvgNft.mintNft(3000_00000000);

                  await dynamicSvgNft.transferFrom(owner.address, addr1.address, 0);

                  expect(await dynamicSvgNft.ownerOf(0)).to.equal(addr1.address);
              });

              it("Should update balances correctly after mint", async function () {
                  const { dynamicSvgNft, owner } = await loadFixture(deployDynamicSvgNftFixture);

                  expect(await dynamicSvgNft.balanceOf(owner.address)).to.equal(0);

                  await dynamicSvgNft.mintNft(3000_00000000);
                  expect(await dynamicSvgNft.balanceOf(owner.address)).to.equal(1);

                  await dynamicSvgNft.mintNft(2500_00000000);
                  expect(await dynamicSvgNft.balanceOf(owner.address)).to.equal(2);
              });
          });

          describe("Edge Cases", function () {
              it("Should handle very large high values", async function () {
                  const { dynamicSvgNft } = await loadFixture(deployDynamicSvgNftFixture);
                  const veryLargeValue = ethers.MaxInt256;

                  await dynamicSvgNft.mintNft(veryLargeValue);

                  expect(await dynamicSvgNft.getTokenIdToHighValue(0)).to.equal(veryLargeValue);
              });

              it("Should handle negative high values", async function () {
                  const { dynamicSvgNft } = await loadFixture(deployDynamicSvgNftFixture);
                  const negativeValue = -1000_00000000;

                  await dynamicSvgNft.mintNft(negativeValue);

                  expect(await dynamicSvgNft.getTokenIdToHighValue(0)).to.equal(negativeValue);
              });

              it("Should handle multiple NFTs with different thresholds", async function () {
                  const { dynamicSvgNft } = await loadFixture(deployDynamicSvgNftFixture);

                  // Mint 3 NFTs with different thresholds
                  await dynamicSvgNft.mintNft(1500_00000000); // Below current price
                  await dynamicSvgNft.mintNft(2000_00000000); // Equal to current price
                  await dynamicSvgNft.mintNft(2500_00000000); // Above current price

                  // Token 0: high image (price >= threshold)
                  let tokenURI = await dynamicSvgNft.tokenURI(0);
                  let metadata = decodeTokenURI(tokenURI);
                  const highImageURI = await dynamicSvgNft.getHighSVG();
                  expect(metadata.image).to.equal(highImageURI);

                  // Token 1: high image (price >= threshold)
                  tokenURI = await dynamicSvgNft.tokenURI(1);
                  metadata = decodeTokenURI(tokenURI);
                  expect(metadata.image).to.equal(highImageURI);

                  // Token 2: low image (price < threshold)
                  tokenURI = await dynamicSvgNft.tokenURI(2);
                  metadata = decodeTokenURI(tokenURI);
                  const lowImageURI = await dynamicSvgNft.getLowSVG();
                  expect(metadata.image).to.equal(lowImageURI);
              });
          });
      });
