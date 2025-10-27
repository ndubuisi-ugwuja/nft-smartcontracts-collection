const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");
const { networkConfig, developmentChains } = require("../../helper-hardhat-config");
const fs = require("fs");
const path = require("path");

const BASE_FEE = 100000000000000000n; // 0.1 LINK
const GAS_PRICE_LINK = 1000000000n; // 0.000000001 LINK per gas
const WEI_PER_UNIT_LINK = 1000000000000000000n; // 1 LINK = 1e18 wei

// Function to load token URIs from the uploaded file
function getTokenUris() {
    const tokenUrisPath = path.join(__dirname, "../../token-uris.json");

    if (fs.existsSync(tokenUrisPath)) {
        const tokenUris = JSON.parse(fs.readFileSync(tokenUrisPath, "utf8"));
        console.log("✓ Loaded Token URIs from token-uris.json");
        console.log("Token URIs:", tokenUris);
        return tokenUris;
    } else {
        throw new Error("token-uris.json not found! Please run 'node utils/uploadToPinata.js' first.");
    }
}

module.exports = buildModule("RandomIpfsNftModule", (m) => {
    const chainId = network.config.chainId || 31337;
    const config = networkConfig[chainId];

    if (!config) {
        throw new Error(`Network configuration not found for chainId: ${chainId}`);
    }

    let vrfCoordinatorV2Plus = m.getParameter("vrfCoordinatorV2Plus", config.vrfCoordinatorV2Plus);
    const keyHash = m.getParameter("keyHash", config.keyHash);
    const subscriptionId = m.getParameter("subscriptionId", config.subscriptionId);
    const callbackGasLimit = m.getParameter("callbackGasLimit", config.callbackGasLimit);
    const mintFee = m.getParameter("mintFee", config.mintFee);

    // If on development chain, deploy a mock VRF Coordinator
    if (developmentChains.includes(config.name)) {
        const mockVrfCoordinator = m.contract("VRFCoordinatorV2_5Mock", [BASE_FEE, GAS_PRICE_LINK, WEI_PER_UNIT_LINK]);
        vrfCoordinatorV2Plus = mockVrfCoordinator;
    }

    // Load the actual token URIs from Pinata upload
    const dogTokenUris = getTokenUris();

    // Deploy the RandomIpfsNft contract
    const randomIpfsNft = m.contract("RandomIpfsNft", [
        vrfCoordinatorV2Plus,
        keyHash,
        subscriptionId,
        callbackGasLimit,
        dogTokenUris,
        mintFee,
    ]);

    return { randomIpfsNft };
});
