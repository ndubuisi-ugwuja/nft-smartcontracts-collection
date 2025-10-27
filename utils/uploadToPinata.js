const pinataSDK = require("@pinata/sdk");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

// Initialize Pinata with your API keys
const pinataApiKey = process.env.PINATA_API_KEY;
const pinataSecretApiKey = process.env.PINATA_API_SECRET;
const pinata = new pinataSDK(pinataApiKey, pinataSecretApiKey);

async function storeImages(imagesFilePath) {
    const fullImagesPath = path.resolve(imagesFilePath);
    const files = fs.readdirSync(fullImagesPath);
    let responses = [];

    console.log("Uploading images to Pinata...");

    for (const fileIndex in files) {
        const file = files[fileIndex];
        console.log(`Working on ${file}...`);

        const readableStreamForFile = fs.createReadStream(`${fullImagesPath}/${file}`);

        try {
            const response = await pinata.pinFileToIPFS(readableStreamForFile, {
                pinataMetadata: {
                    name: file.replace(".png", ""),
                },
            });
            responses.push(response);
            console.log(`✓ Uploaded ${file}: ${response.IpfsHash}`);
        } catch (error) {
            console.log(`✗ Error uploading ${file}:`, error);
        }
    }

    return { responses, files };
}

async function storeTokenUriMetadata(metadata) {
    try {
        console.log("Uploading metadata to Pinata...");
        const response = await pinata.pinJSONToIPFS(metadata, {
            pinataMetadata: {
                name: metadata.name,
            },
        });
        console.log(`✓ Metadata uploaded: ${response.IpfsHash}`);
        return response;
    } catch (error) {
        console.log("✗ Error uploading metadata:", error);
        throw error;
    }
}

async function handleTokenUris() {
    const tokenUris = [];

    // Upload images and get their IPFS hashes
    const { responses: imageUploadResponses, files } = await storeImages("./images/randomNft");

    // For each uploaded image, create and upload metadata
    for (const imageUploadResponseIndex in imageUploadResponses) {
        const tokenUriMetadata = {
            name: files[imageUploadResponseIndex].replace(".png", ""),
            description: `An adorable ${files[imageUploadResponseIndex].replace(".png", "")} pup!`,
            image: `ipfs://${imageUploadResponses[imageUploadResponseIndex].IpfsHash}`,
            attributes: [
                {
                    trait_type: "Cuteness",
                    value: 100,
                },
            ],
        };

        const metadataUploadResponse = await storeTokenUriMetadata(tokenUriMetadata);
        tokenUris.push(`ipfs://${metadataUploadResponse.IpfsHash}`);
    }

    console.log("\n=== Token URIs ===");
    console.log(tokenUris);
    console.log("==================\n");

    return tokenUris;
}

// Main execution
async function main() {
    try {
        // Test Pinata authentication
        const testAuth = await pinata.testAuthentication();
        console.log("✓ Pinata authentication successful!");
        console.log(testAuth);

        // Upload images and metadata
        const tokenUris = await handleTokenUris();

        // Save token URIs to a file for use in deployment
        fs.writeFileSync("./token-uris.json", JSON.stringify(tokenUris, null, 2));
        console.log("✓ Token URIs saved to token-uris.json");

        return tokenUris;
    } catch (error) {
        console.error("Error in main execution:", error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = { storeImages, storeTokenUriMetadata, handleTokenUris };
