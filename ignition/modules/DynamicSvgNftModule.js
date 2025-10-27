const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");
const fs = require("fs");
const path = require("path");
const { networkConfig, developmentChains, DECIMALS, INITIAL_PRICE } = require("../../helper-hardhat-config");

module.exports = buildModule("DynamicSvgNftModule", (m) => {
    // --- Load SVGs from images folder ---
    const lowSvgPath = path.join(__dirname, "../../images/dynamicNft/frown.svg");
    const highSvgPath = path.join(__dirname, "../../images/dynamicNft/happy.svg");

    const lowSvg = fs.readFileSync(lowSvgPath, { encoding: "utf8" });
    const highSvg = fs.readFileSync(highSvgPath, { encoding: "utf8" });

    // --- Get current network info ---
    const chainId = network.config.chainId || 31337;
    const networkName = network.name; // Get the network name
    const config = networkConfig[chainId];

    console.log(`\n🚀 Deploying DynamicSvgNft on network: ${networkName} (chainId: ${chainId})`);

    // --- Determine price feed address ---
    let priceFeedAddress;

    if (developmentChains.includes(networkName)) {
        // Local/Dev network: deploy a mock
        console.log("Local network detected. Deploying MockV3Aggregator...");
        const mockV3Aggregator = m.contract("MockV3Aggregator", [DECIMALS, INITIAL_PRICE]);
        priceFeedAddress = mockV3Aggregator;
    } else {
        // Testnet/Mainnet: use real Chainlink feed from config
        console.log("Using existing Chainlink price feed...");
        priceFeedAddress = config?.ethUsdPriceFeed;

        if (!priceFeedAddress) {
            throw new Error(`No ethUsdPriceFeed found for chainId ${chainId} in networkConfig`);
        }
    }

    // --- Deploy DynamicSvgNft contract ---
    const dynamicSvgNft = m.contract("DynamicSvgNft", [priceFeedAddress, lowSvg, highSvg]);

    // --- Return deployments ---
    return { dynamicSvgNft, priceFeedAddress };
});
