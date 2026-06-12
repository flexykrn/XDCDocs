---
title: VRF — Verifiable Randomness on XDC
description: Chainlink VRF integration for XDC — secure randomness for gaming, NFTs, and fair selection.
---

# VRF (Verifiable Randomness)

Chainlink VRF provides cryptographically secure randomness for smart contracts. This guide covers VRF integration on XDC.

## Why VRF?

Blockchains cannot generate true randomness. Common solutions like `block.timestamp` or `blockhash` are:
- **Predictable**: Miners can influence values
- **Manipulable**: Block producers can choose not to publish blocks
- **Exploitable**: Attackers can calculate outcomes in advance

VRF solves this by providing:
- **Cryptographically secure** randomness
- **Verifiable** on-chain proof
- **Unpredictable** until revealed
- **Tamper-proof** generation

## Chainlink VRF v2

### Basic Implementation

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";

contract RandomNumberGenerator is VRFConsumerBaseV2 {
    address public vrfCoordinator;
    bytes32 public keyHash;
    uint64 public subscriptionId;
    uint32 public callbackGasLimit = 100000;
    uint16 public requestConfirmations = 3;
    uint32 public numWords = 1;
    
    mapping(uint256 => uint256) public requestToRandomNumber;
    mapping(uint256 => address) public requestToUser;
    
    event RandomNumberRequested(uint256 requestId, address user);
    event RandomNumberFulfilled(uint256 requestId, uint256 randomNumber);
    
    constructor(
        address _vrfCoordinator,
        bytes32 _keyHash,
        uint64 _subscriptionId
    ) VRFConsumerBaseV2(_vrfCoordinator) {
        vrfCoordinator = _vrfCoordinator;
        keyHash = _keyHash;
        subscriptionId = _subscriptionId;
    }
    
    function requestRandomNumber() external returns (uint256 requestId) {
        requestId = requestRandomness(
            keyHash,
            subscriptionId,
            requestConfirmations,
            callbackGasLimit,
            numWords
        );
        
        requestToUser[requestId] = msg.sender;
        emit RandomNumberRequested(requestId, msg.sender);
    }
    
    function fulfillRandomWords(uint256 _requestId, uint256[] memory _randomWords) internal override {
        uint256 randomNumber = _randomWords[0];
        requestToRandomNumber[_requestId] = randomNumber;
        emit RandomNumberFulfilled(_requestId, randomNumber);
    }
    
    function getRandomNumber(uint256 _requestId) external view returns (uint256) {
        require(requestToUser[_requestId] == msg.sender, "Not your request");
        return requestToRandomNumber[_requestId];
    }
    
    function getRandomInRange(uint256 _requestId, uint256 max) external view returns (uint256) {
        uint256 randomNumber = requestToRandomNumber[_requestId];
        return (randomNumber % max) + 1;
    }
}
```

### NFT Minting with Random Traits

```solidity
contract RandomNFT is VRFConsumerBaseV2, ERC721 {
    struct Trait {
        uint256 rarity;
        uint256 power;
        uint256 color;
    }
    
    mapping(uint256 => Trait) public tokenTraits;
    mapping(uint256 => uint256) public requestToTokenId;
    
    function mintRandomNFT() external returns (uint256 requestId) {
        uint256 tokenId = totalSupply();
        _safeMint(msg.sender, tokenId);
        
        requestId = requestRandomness(
            keyHash,
            subscriptionId,
            requestConfirmations,
            callbackGasLimit,
            numWords
        );
        
        requestToTokenId[requestId] = tokenId;
    }
    
    function fulfillRandomWords(uint256 _requestId, uint256[] memory _randomWords) internal override {
        uint256 tokenId = requestToTokenId[_requestId];
        uint256 randomness = _randomWords[0];
        
        tokenTraits[tokenId] = Trait({
            rarity: (randomness % 100) + 1,
            power: ((randomness / 100) % 100) + 1,
            color: ((randomness / 10000) % 10) + 1
        });
    }
}
```

### Lottery/Fair Selection

```solidity
contract FairLottery is VRFConsumerBaseV2 {
    address[] public participants;
    uint256 public winner;
    bool public lotteryClosed;
    
    function enterLottery() external {
        require(!lotteryClosed, "Lottery closed");
        participants.push(msg.sender);
    }
    
    function drawWinner() external returns (uint256 requestId) {
        require(participants.length > 0, "No participants");
        require(!lotteryClosed, "Already drawn");
        
        lotteryClosed = true;
        
        requestId = requestRandomness(
            keyHash,
            subscriptionId,
            requestConfirmations,
            callbackGasLimit,
            numWords
        );
    }
    
    function fulfillRandomWords(uint256 _requestId, uint256[] memory _randomWords) internal override {
        uint256 randomness = _randomWords[0];
        winner = randomness % participants.length;
        
        emit WinnerSelected(participants[winner], randomness);
    }
    
    event WinnerSelected(address winner, uint256 randomness);
}
```

## VRF v2.5 (Direct Funding)

```solidity
import "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

contract VRFv2PlusConsumer is VRFConsumerBaseV2Plus {
    function requestRandomWords() external returns (uint256 requestId) {
        VRFV2PlusClient.RandomWordsRequest memory request = VRFV2PlusClient.RandomWordsRequest({
            keyHash: keyHash,
            subId: subscriptionId,
            requestConfirmations: requestConfirmations,
            callbackGasLimit: callbackGasLimit,
            numWords: numWords,
            extraArgs: VRFV2PlusClient._argsToBytes(
                VRFV2PlusClient.ExtraArgsV1({nativePayment: true})
            )
        });
        
        requestId = s_vrfCoordinator.requestRandomWords(request);
    }
}
```

## Security Considerations

1. **Request-Response Pattern**: Randomness is not immediate. Design for async flow.
2. **Callback Gas Limit**: Ensure sufficient gas for fulfillment.
3. **Subscription Balance**: Maintain enough LINK/native tokens for requests.
4. **Reentrancy**: Protect fulfillment functions.
5. **Front-running**: Commit-reveal pattern for sensitive operations.

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| "VRF timeout" | Insufficient callback gas | Increase callbackGasLimit |
| "Request failed" | Insufficient subscription balance | Fund subscription |
| "Invalid randomness" | Callback reverted | Check fulfillment logic |
| "High gas costs" | Complex fulfillment | Optimize callback code |
