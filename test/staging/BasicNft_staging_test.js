const { expect } = require("chai");
const { ethers, network } = require("hardhat");
require("dotenv").config();

describe("BasicNft Staging Tests", function () {
    // Skip if not on Sepolia network
    if (network.name !== "sepolia") {
        describe.skip("Skipping staging tests - not on Sepolia", function () {
            it("placeholder", function () {});
        });
        return;
    }

    let basicNft;
    let owner;
    let addr1;
    const CONTRACT_ADDRESS = process.env.BASIC_NFT_ADDRESS; // Add deployed contract address to .env

    before(async function () {
        // Get signers
        [owner, addr1] = await ethers.getSigners();

        // Connect to deployed contract
        if (!CONTRACT_ADDRESS) {
            throw new Error("Please set BASIC_NFT_ADDRESS in your .env file");
        }

        const BasicNft = await ethers.getContractFactory("BasicNft");
        basicNft = BasicNft.attach(CONTRACT_ADDRESS);

        console.log("Testing BasicNft contract at:", CONTRACT_ADDRESS);
        console.log("Using account:", owner.address);
    });

    describe("Deployment checks", function () {
        it("Should have correct name and symbol", async function () {
            expect(await basicNft.name()).to.equal("Dogie");
            expect(await basicNft.symbol()).to.equal("DOG");
        });

        it("Should return correct token URI format", async function () {
            const expectedUri =
                "ipfs://bafybeig37ioir76s7mg5oobetncojcm3c3hxasyd4rvid4jqhy4gkaheg4/?filename=0-PUG.json";
            const uri = await basicNft.tokenURI(0);
            expect(uri).to.equal(expectedUri);
        });
    });

    describe("Minting functionality", function () {
        let initialCounter;
        let initialBalance;

        before(async function () {
            initialCounter = await basicNft.getTokenCounter();
            initialBalance = await basicNft.balanceOf(owner.address);
            console.log("Initial token counter:", initialCounter.toString());
            console.log("Initial balance:", initialBalance.toString());
        });

        it("Should mint NFT and increase counter", async function () {
            const tx = await basicNft.mintNft();
            console.log("Minting transaction hash:", tx.hash);

            const receipt = await tx.wait();
            console.log("Transaction confirmed in block:", receipt.blockNumber);

            const newCounter = await basicNft.getTokenCounter();
            const newBalance = await basicNft.balanceOf(owner.address);

            expect(newCounter).to.equal(initialCounter + 1n);
            expect(newBalance).to.equal(initialBalance + 1n);
        });

        it("Should verify ownership of newly minted token", async function () {
            const currentCounter = await basicNft.getTokenCounter();
            const lastTokenId = currentCounter - 1n;

            const tokenOwner = await basicNft.ownerOf(lastTokenId);
            expect(tokenOwner).to.equal(owner.address);
        });
    });

    describe("Gas estimation", function () {
        it("Should estimate gas for minting", async function () {
            const gasEstimate = await basicNft.mintNft.estimateGas();
            console.log("Estimated gas for minting:", gasEstimate.toString());
            expect(gasEstimate).to.be.gt(0);
        });
    });
});
