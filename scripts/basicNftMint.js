const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
    try {
        const [deployer] = await ethers.getSigners();

        const basicNftAddress = process.env.BASIC_NFT_ADDRESS;
        const basicNft = await ethers.getContractAt("BasicNft", basicNftAddress, deployer);
        const basicMintTx = await basicNft.mintNft();
        await basicMintTx.wait(1);
        console.log(`Basic NFT index 0 tokenURI: ${await basicNft.tokenURI(0)}`);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

main();
