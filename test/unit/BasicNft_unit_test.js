const { expect } = require("chai");
const { ethers, network } = require("hardhat");
const { developmentChains } = require("../../helper-hardhat-config");

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("BasicNft", function () {
          let basicNft;
          let owner;
          let addr1;

          beforeEach(async function () {
              [owner, addr1] = await ethers.getSigners();
              const BasicNft = await ethers.getContractFactory("BasicNft");
              basicNft = await BasicNft.deploy();
              await basicNft.waitForDeployment();
          });

          it("Should initialize token counter to zero", async function () {
              const counter = await basicNft.getTokenCounter();
              expect(counter).to.equal(0);
          });

          it("Should set correct name and symbol", async function () {
              expect(await basicNft.name()).to.equal("Dogie");
              expect(await basicNft.symbol()).to.equal("DOG");
          });

          it("Should mint NFT and increase counter", async function () {
              await basicNft.mintNft();
              const counter = await basicNft.getTokenCounter();
              expect(counter).to.equal(1);
          });

          it("Should return correct token ID from mintNft", async function () {
              const tx = await basicNft.mintNft();
              await tx.wait();
              expect(await basicNft.getTokenCounter()).to.equal(1);
          });

          it("Should assign minted token to caller", async function () {
              await basicNft.mintNft();
              const balance = await basicNft.balanceOf(owner.address);
              expect(balance).to.equal(1);
          });

          it("Should handle multiple mints", async function () {
              await basicNft.mintNft();
              await basicNft.mintNft();
              await basicNft.mintNft();
              const counter = await basicNft.getTokenCounter();
              const balance = await basicNft.balanceOf(owner.address);
              expect(counter).to.equal(3);
              expect(balance).to.equal(3);
          });

          it("Should mint to different addresses", async function () {
              await basicNft.connect(addr1).mintNft();
              const balance = await basicNft.balanceOf(addr1.address);
              expect(balance).to.equal(1);
          });

          it("Should return correct token URI", async function () {
              const expectedUri =
                  "ipfs://bafybeig37ioir76s7mg5oobetncojcm3c3hxasyd4rvid4jqhy4gkaheg4/?filename=0-PUG.json";
              const uri = await basicNft.tokenURI(0);
              expect(uri).to.equal(expectedUri);
          });

          it("Should return same token URI for all token IDs", async function () {
              const uri1 = await basicNft.tokenURI(0);
              const uri2 = await basicNft.tokenURI(1);
              const uri3 = await basicNft.tokenURI(999);
              expect(uri1).to.equal(uri2);
              expect(uri2).to.equal(uri3);
          });

          it("Should have correct sequential token IDs", async function () {
              await basicNft.mintNft();
              await basicNft.mintNft();
              await basicNft.mintNft();

              const owner0 = await basicNft.ownerOf(0);
              const owner1 = await basicNft.ownerOf(1);
              const owner2 = await basicNft.ownerOf(2);

              expect(owner0).to.equal(owner.address);
              expect(owner1).to.equal(owner.address);
              expect(owner2).to.equal(owner.address);
          });
      });
