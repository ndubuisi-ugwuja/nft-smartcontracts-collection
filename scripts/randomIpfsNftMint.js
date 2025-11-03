const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
    const [deployer] = await ethers.getSigners();
    const randomIpfsAddress = process.env.RANDOM_IPFS_NFT_ADDRESS;
    const randomIpfs = await ethers.getContractAt("RandomIpfsNft", randomIpfsAddress, deployer);

    const mintFee = await randomIpfs.getMintFee();
    const requestNftTx = await randomIpfs.requestNft({ value: mintFee });
    await requestNftTx.wait(1);

    // Listen for the NftMinted event
    randomIpfs.once("NftMinted", async (tokenId, breed) => {
        console.log(`\n✓ NFT Minted!`);
        console.log(`Token ID: ${tokenId}`);
        console.log(`Breed: ${breed}`);
        const tokenURI = await randomIpfs.tokenURI(tokenId);
        console.log(`Token URI: ${tokenURI}`);
        process.exit(0);
    });

    // Timeout after 5 minutes
    setTimeout(() => {
        console.log("Timeout waiting for VRF response");
        process.exit(1);
    }, 300000);
}

main();
