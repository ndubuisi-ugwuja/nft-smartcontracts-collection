const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
    try {
        const [deployer] = await ethers.getSigners();

        const dynamicSvgAddress = process.env.DYNAMIC_SVG_NFT_ADDRESS;
        const dynamicSvg = await ethers.getContractAt("DynamicSvgNft", dynamicSvgAddress, deployer);

        const value = ethers.parseUnits("2000", 8);
        const dynamicSvgMintTx = await dynamicSvg.mintNft(value);
        await dynamicSvgMintTx.wait(1);

        console.log(`Dynamic SVG NFT index 0 tokenURI: ${await dynamicSvg.tokenURI(0)}`);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

main();
