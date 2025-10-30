const { expect } = require("chai");
const { ethers, network } = require("hardhat");

describe("RandomIpfsNft Staging Tests", function () {
    // Skip if not on Sepolia network
    if (network.name !== "sepolia") {
        console.log(`Skipping staging tests - Current network: ${network.name} (requires sepolia)`);
        return;
    }

    let randomIpfsNft;
    let owner;
    const CONTRACT_ADDRESS = process.env.RANDOM_IPFS_NFT_ADDRESS;

    before(async function () {
        this.timeout(60000);

        [owner] = await ethers.getSigners();

        if (!CONTRACT_ADDRESS) {
            throw new Error("Please set RANDOM_IPFS_NFT_ADDRESS in your .env file");
        }

        const RandomIpfsNft = await ethers.getContractFactory("RandomIpfsNft");
        randomIpfsNft = RandomIpfsNft.attach(CONTRACT_ADDRESS);

        console.log("Testing RandomIpfsNft at:", CONTRACT_ADDRESS);
        console.log("Using account:", owner.address);
        console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(owner.address)), "ETH");

        const code = await ethers.provider.getCode(CONTRACT_ADDRESS);
        if (code === "0x") {
            throw new Error("No contract found at the specified address");
        }
    });

    describe("Deployment and configuration", function () {
        it("Should have correct name and symbol", async function () {
            const name = await randomIpfsNft.name();
            const symbol = await randomIpfsNft.symbol();
            expect(name).to.equal("Random IPFS NFT");
            expect(symbol).to.equal("RIN");
        });

        it("Should have mint fee and token URIs configured", async function () {
            const mintFee = await randomIpfsNft.getMintFee();
            const pug = await randomIpfsNft.getDogTokenUris(0);
            const shiba = await randomIpfsNft.getDogTokenUris(1);
            const stBernard = await randomIpfsNft.getDogTokenUris(2);

            expect(mintFee).to.be.gt(0n);
            expect(pug).to.include("ipfs://");
            expect(shiba).to.include("ipfs://");
            expect(stBernard).to.include("ipfs://");
        });

        it("Should have correct chance array", async function () {
            const chanceArray = await randomIpfsNft.getChanceArray();
            expect(chanceArray[0]).to.equal(10n);
            expect(chanceArray[1]).to.equal(30n);
            expect(chanceArray[2]).to.equal(100n);
        });
    });

    describe("Breed selection logic", function () {
        it("Should correctly map random values to breeds", async function () {
            const pugBreed = await randomIpfsNft.getBreedFromModdedRng(5);
            const shibaBreed = await randomIpfsNft.getBreedFromModdedRng(25);
            const stBernardBreed = await randomIpfsNft.getBreedFromModdedRng(75);

            expect(pugBreed).to.equal(0n);
            expect(shibaBreed).to.equal(1n);
            expect(stBernardBreed).to.equal(2n);
        });
    });

    describe("Payment validation", function () {
        it("Should revert when insufficient ETH is sent", async function () {
            const mintFee = await randomIpfsNft.getMintFee();
            const insufficient = mintFee - 1n;

            await expect(randomIpfsNft.requestNft({ value: insufficient })).to.be.revertedWithCustomError(
                randomIpfsNft,
                "RandomIpfsNft__NeedMoreETHSent",
            );
        });
    });

    describe("Contract state", function () {
        it("Should show current token counter and contract balance", async function () {
            const tokenCounter = await randomIpfsNft.getTokenCounter();
            const contractBalance = await ethers.provider.getBalance(CONTRACT_ADDRESS);

            expect(tokenCounter).to.be.gte(0n);
            expect(contractBalance).to.be.gte(0n);
        });
    });

    after(function () {
        console.log("\n=== Staging Test Complete ===");
        console.log("✓ Contract deployment verified");
        console.log("✓ Configuration validated");
        console.log("✓ Payment validation working");
        console.log("\nTo test minting:");
        console.log("1. Ensure VRF subscription is funded with LINK");
        console.log("2. Add contract as consumer at https://vrf.chain.link");
        console.log("3. Call requestNft() with mint fee");
        console.log("4. Wait 2-5 minutes for VRF callback");
    });
});
