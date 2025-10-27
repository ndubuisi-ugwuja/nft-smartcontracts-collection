// Chainlink VRF & Keepers configuration per network
const networkConfig = {
    11155111: {
        name: "sepolia",
        vrfCoordinatorV2Plus: "0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B",
        keyHash: "0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae",
        subscriptionId: "87493399841768530621857160339541952434275371257915447427041707750846371254941",
        callbackGasLimit: "500000",
        mintFee: "10000000000000000",
        ethUsdPriceFeed: "0x694AA1769357215DE4FAC081bf1f309aDC325306", // Chainlink ETH/USD Sepolia
    },
    31337: {
        name: "localhost",
        // No vrfCoordinatorV2Plus here, because we'll deploy a mock
        keyHash: "0x6c3699283bda56ad74f6b855546325b68d482e983852a7e34c2d6a8c3f0a5e2a",
        subscriptionId: "1",
        callbackGasLimit: "500000",
        mintFee: "10000000000000000",
        decimals: 8,
        initialAnswer: 2000e8, // 2000 USD with 8 decimals
    },
    1: {
        name: "mainnet",
        ethUsdPriceFeed: "0x5f4ec3df9cbd43714fe2740f5e3616155c5b8419", // Chainlink ETH/USD Mainnet
    },
};

const developmentChains = ["hardhat", "localhost"];
const DECIMALS = 8;
const INITIAL_PRICE = 2000e8;

module.exports = {
    networkConfig,
    developmentChains,
    DECIMALS,
    INITIAL_PRICE,
};
