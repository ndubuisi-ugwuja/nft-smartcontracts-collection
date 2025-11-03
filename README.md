# 🧬 NFT Collection — BasicNft, RandomIpfsNft & DynamicSvgNft

This repository contains three distinct smart contracts that demonstrate different NFT minting and metadata generation mechanisms using Solidity, Hardhat, and Chainlink.  
It’s designed to serve as both a **learning project** and a **solid foundation** for building real-world NFT collections with dynamic on-chain and off-chain features.

---

- [Overview](#overview)
- [Contracts](#contracts)
    - [1️⃣ BasicNft](#1️⃣-basicnft)
    - [2️⃣ RandomIpfsNft](#2️⃣-randomipfsnft)
    - [3️⃣ DynamicSvgNft](#3️⃣-dynamicsvgnft)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Running Tests](#running-tests)
- [Deployment](#deployment)
- [License](#license)

---

## 🧩 Overview

This project showcases **three NFT minting strategies**:

1. **BasicNft** — A simple ERC721 NFT with fixed metadata stored off-chain (e.g., IPFS or Pinata).
2. **RandomIpfsNft** — A Chainlink VRF-powered NFT that assigns random traits or images to each mint (stored on IPFS).
3. **DynamicSvgNft** — A fully on-chain NFT that dynamically changes its appearance based on **real-time price feed data** from **Chainlink Oracles**.

Each contract demonstrates progressively advanced techniques for NFT creation, metadata encoding, and blockchain integration.

---

## ⚙️ Contracts

### 1️⃣ BasicNft

**Purpose:**  
A simple ERC721 contract representing static NFTs with pre-uploaded metadata URIs.

**Key Features:**

- Uses `ERC721` from OpenZeppelin.
- Simple `mintNft()` function for minting.
- Metadata hosted off-chain (e.g., IPFS).

**Example Use Case:**  
Profile pictures, collectibles, or digital art with fixed attributes.

---

### 2️⃣ RandomIpfsNft

**Purpose:**  
An NFT that assigns a **random image** or trait using **Chainlink VRF (Verifiable Random Function)** for provable randomness.

**Key Features:**

- Integrates Chainlink VRF for randomness.
- Supports multiple IPFS image URIs.
- Randomly assigns traits at minting.
- Includes funding and fulfillment logic for VRF.

**Example Use Case:**  
Generative art collections, randomized character drops, or game items with varying rarity.

---

### 3️⃣ DynamicSvgNft

**Purpose:**  
A **fully on-chain** NFT whose image changes dynamically based on **real-world data** — such as the ETH/USD price feed.

**Key Features:**

- Uses Chainlink Price Feed (`AggregatorV3Interface`).
- Encodes SVG images as base64 data URIs (no off-chain dependency).
- Dynamically switches between two SVGs (e.g., “happy” vs “sad” states).
- Demonstrates complete on-chain metadata generation.

**Example Use Case:**  
Dynamic NFTs that react to real-world data — for example:

- Bullish/Bearish market sentiment.
- Weather-based artwork.
- Game characters that evolve with time.

---

## 🏗️ Architecture

contracts/
│
├── BasicNft.sol
├── RandomIpfsNft.sol
└── DynamicSvgNft.sol
│
├── mocks/
│ ├── MockV3Aggregator.sol
│ └── VRFCoordinatorV2Mock.sol
│
scripts/
│ ├── deploy.js
│ └── helper-hardhat-config.js
│
test/
│ ├── BasicNft.test.js
│ ├── RandomIpfsNft.test.js
│ └── DynamicSvgNft.test.js
│
├── images/
│ ├── frown.svg
│ └── happy.svg
│
└── hardhat.config.js

---

## 💻 Tech Stack

| Component                 | Description                                  |
| ------------------------- | -------------------------------------------- |
| **Solidity**              | Smart contract language                      |
| **Hardhat**               | Ethereum development environment             |
| **Ethers.js**             | Contract interaction library                 |
| **Chai / Mocha**          | Unit testing framework                       |
| **Chainlink VRF**         | Verifiable randomness for NFTs               |
| **Chainlink Price Feeds** | Dynamic data input (price-based NFTs)        |
| **IPFS / Pinata**         | Off-chain storage for RandomIpfsNft metadata |
| **OpenZeppelin**          | Secure ERC721 implementation and utilities   |

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git https://github.com/ndubuisi-ugwuja/nft-smartcontracts-collection.git
cd nft-smartcontracts-collection
```

### 2. Install Dependencies

```bash
yarn install
```

### 3. Compile the Contracts

```bash
yarn hardhat compile
```

### 4. Start a Local Network

```bash
yarn hardhat node
```

## 🧪 Running Tests

Unit tests are written using Mocha and Chai, covering:

- Contract initialization
- Minting logic
- Dynamic image changes
- Chainlink oracle responses
- ERC721 compliance

#### Run unit tests:

```bash
yarn hardhat test
```

#### Run staging tests:

```bash
yarn hardhat test --network sepolia
```

## 5. Deployments

```bash
yarn hardhat ignition deploy ignition/modules/BasicNftModule.js
yarn hardhat ignition deploy ignition/modules/DynamicSvgNftModule.js
yarn hardhat ignition deploy ignition/modules/RandomIpfsNftModule.js
```

### 📄 License

This project is licensed under the MIT License — feel free to use, modify, and build on it.

### 👨‍💻 Author

Ndubuisi Ugwuja
