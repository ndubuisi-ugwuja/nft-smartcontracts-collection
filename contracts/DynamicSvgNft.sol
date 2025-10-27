// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import {Base64} from "base64-sol/base64.sol";

/**
 * @title DynamicSvgNft
 * @notice An NFT that dynamically changes its image based on Chainlink price feed data
 * @dev Uses Chainlink Price Feeds to determine which SVG image to display
 */
contract DynamicSvgNft is ERC721, Ownable {
    // Custom Errors
    error DynamicSvgNft__NonExistentToken();
    error DynamicSvgNft__InvalidPriceFeed();

    // State variables
    uint256 private s_tokenCounter;
    string private s_lowImageURI;
    string private s_highImageURI;

    mapping(uint256 => int256) private s_tokenIdToHighValues;
    AggregatorV3Interface internal immutable i_priceFeed;

    // Events
    event CreatedNFT(uint256 indexed tokenId, int256 highValue);

    /**
     * @notice Constructor to initialize the Dynamic SVG NFT contract
     * @param priceFeedAddress The address of the Chainlink price feed
     * @param lowSvg The SVG string for the "low" state
     * @param highSvg The SVG string for the "high" state
     */
    constructor(
        address priceFeedAddress,
        string memory lowSvg,
        string memory highSvg
    ) ERC721("Dynamic SVG NFT", "DSN") Ownable(msg.sender) {
        if (priceFeedAddress == address(0)) {
            revert DynamicSvgNft__InvalidPriceFeed();
        }
        s_tokenCounter = 0;
        i_priceFeed = AggregatorV3Interface(priceFeedAddress);
        s_lowImageURI = svgToImageURI(lowSvg);
        s_highImageURI = svgToImageURI(highSvg);
    }

    /**
     * @notice Mints a new NFT with a specified high value threshold
     * @param highValue The price threshold above which the NFT displays the "high" image
     */
    function mintNft(int256 highValue) public {
        uint256 newTokenId = s_tokenCounter;
        s_tokenIdToHighValues[newTokenId] = highValue;
        s_tokenCounter++;
        _safeMint(msg.sender, newTokenId);
        emit CreatedNFT(newTokenId, highValue);
    }

    /**
     * @notice Converts an SVG string to a base64-encoded data URI
     * @param svg The SVG string to convert
     * @return The base64-encoded image URI
     */
    function svgToImageURI(string memory svg) public pure returns (string memory) {
        string memory baseURL = "data:image/svg+xml;base64,";
        string memory svgBase64Encoded = Base64.encode(bytes(svg));
        return string(abi.encodePacked(baseURL, svgBase64Encoded));
    }

    /**
     * @notice Returns the base URI for token metadata
     * @return The base URI string
     */
    function _baseURI() internal pure override returns (string memory) {
        return "data:application/json;base64,";
    }

    /**
     * @notice Returns the token URI with metadata for a given token ID
     * @param tokenId The ID of the token
     * @return The complete token URI with base64-encoded JSON metadata
     */
    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        // FIX: Use _ownerOf instead of _exists (OpenZeppelin v5.0+)
        if (_ownerOf(tokenId) == address(0)) {
            revert DynamicSvgNft__NonExistentToken();
        }

        (, int256 price, , , ) = i_priceFeed.latestRoundData();
        string memory imageURI = s_lowImageURI;

        if (price >= s_tokenIdToHighValues[tokenId]) {
            imageURI = s_highImageURI;
        }

        return
            string(
                abi.encodePacked(
                    _baseURI(),
                    Base64.encode(
                        bytes(
                            abi.encodePacked(
                                '{"name":"',
                                name(),
                                '", "description":"An NFT that changes based on the Chainlink Feed", ',
                                '"attributes": [{"trait_type": "coolness", "value": 100}], "image":"',
                                imageURI,
                                '"}'
                            )
                        )
                    )
                )
            );
    }

    // View / Pure Functions

    /**
     * @notice Returns the base64-encoded low SVG image URI
     * @return The low image URI
     */
    function getLowSVG() public view returns (string memory) {
        return s_lowImageURI;
    }

    /**
     * @notice Returns the base64-encoded high SVG image URI
     * @return The high image URI
     */
    function getHighSVG() public view returns (string memory) {
        return s_highImageURI;
    }

    /**
     * @notice Returns the Chainlink price feed interface
     * @return The price feed interface
     */
    function getPriceFeed() public view returns (AggregatorV3Interface) {
        return i_priceFeed;
    }

    /**
     * @notice Returns the current token counter
     * @return The number of tokens minted
     */
    function getTokenCounter() public view returns (uint256) {
        return s_tokenCounter;
    }

    /**
     * @notice Returns the high value threshold for a specific token
     * @param tokenId The ID of the token
     * @return The high value threshold
     */
    function getTokenIdToHighValue(uint256 tokenId) public view returns (int256) {
        return s_tokenIdToHighValues[tokenId];
    }
}
