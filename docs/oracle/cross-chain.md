---
title: Cross-Chain Messaging — CCIP and Inter-Chain Communication on XDC
description: Chainlink CCIP integration for XDC — cross-chain token transfers, messaging, and interoperability.
---

# Cross-Chain Messaging

Chainlink CCIP (Cross-Chain Interoperability Protocol) enables secure cross-chain communication for tokens and arbitrary messages.

## Why Cross-Chain?

Blockchains are isolated networks. Cross-chain enables:
- **Multi-chain liquidity** access
- **Asset bridging** between networks
- **Cross-chain governance** voting
- **Interoperable dApps** across ecosystems

## CCIP Architecture

```
Source Chain → CCIP Router → Off-Chain DON → Destination Chain
```

Components:
- **Router**: Entry/exit point on each chain
- **Off-Chain DON**: Decentralized oracle network validates messages
- **Commit Store**: Tracks message status
- **Execution**: Delivers messages to destination

## Basic Implementation

### Cross-Chain Token Transfer

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@chainlink/contracts/src/v0.8/ccip/interfaces/IRouterClient.sol";
import "@chainlink/contracts/src/v0.8/ccip/libraries/Client.sol";

contract CrossChainTokenTransfer {
    IRouterClient public router;
    
    event MessageSent(bytes32 messageId, uint64 destinationChainSelector, address receiver);
    
    constructor(address _router) {
        router = IRouterClient(_router);
    }
    
    function sendToken(
        uint64 destinationChainSelector,
        address receiver,
        address token,
        uint256 amount
    ) external payable returns (bytes32 messageId) {
        Client.EVMTokenAmount[] memory tokenAmounts = new Client.EVMTokenAmount[](1);
        tokenAmounts[0] = Client.EVMTokenAmount({
            token: token,
            amount: amount
        });
        
        Client.EVM2AnyMessage memory message = Client.EVM2AnyMessage({
            receiver: abi.encode(receiver),
            data: "",
            tokenAmounts: tokenAmounts,
            extraArgs: Client._argsToBytes(
                Client.EVMExtraArgsV1({gasLimit: 200_000})
            ),
            feeToken: address(0) // Pay with native
        });
        
        uint256 fees = router.getFee(destinationChainSelector, message);
        require(msg.value >= fees, "Insufficient fees");
        
        messageId = router.ccipSend{value: fees}(destinationChainSelector, message);
        emit MessageSent(messageId, destinationChainSelector, receiver);
        
        return messageId;
    }
}
```

### Cross-Chain Messaging

```solidity
contract CrossChainMessenger {
    IRouterClient public router;
    mapping(uint64 => address) public destinationContracts;
    
    event MessageSent(bytes32 messageId, uint64 destinationChainSelector, address receiver);
    event MessageReceived(bytes32 messageId, uint64 sourceChainSelector, address sender);
    
    constructor(address _router) {
        router = IRouterClient(_router);
    }
    
    function sendMessage(
        uint64 destinationChainSelector,
        address receiver,
        bytes memory message
    ) external payable returns (bytes32 messageId) {
        Client.EVM2AnyMessage memory evmMessage = Client.EVM2AnyMessage({
            receiver: abi.encode(receiver),
            data: message,
            tokenAmounts: new Client.EVMTokenAmount[](0),
            extraArgs: Client._argsToBytes(
                Client.EVMExtraArgsV1({gasLimit: 200_000})
            ),
            feeToken: address(0)
        });
        
        uint256 fees = router.getFee(destinationChainSelector, evmMessage);
        require(msg.value >= fees, "Insufficient fees");
        
        messageId = router.ccipSend{value: fees}(destinationChainSelector, evmMessage);
        emit MessageSent(messageId, destinationChainSelector, receiver);
        
        return messageId;
    }
    
    function ccipReceive(Client.Any2EVMMessage memory message) external {
        emit MessageReceived(
            message.messageId,
            message.sourceChainSelector,
            abi.decode(message.sender, (address))
        );
        
        _processMessage(message.data);
    }
    
    function _processMessage(bytes memory data) internal {
        // Implementation specific
    }
}
```

### Cross-Chain Governance

```solidity
contract CrossChainGovernance {
    struct Proposal {
        uint256 id;
        bytes callData;
        uint256 votes;
        bool executed;
    }
    
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    uint256 public proposalCount;
    
    function createProposal(bytes memory callData) external returns (uint256) {
        proposalCount++;
        proposals[proposalCount] = Proposal({
            id: proposalCount,
            callData: callData,
            votes: 0,
            executed: false
        });
        return proposalCount;
    }
    
    function vote(uint256 proposalId) external {
        require(!hasVoted[proposalId][msg.sender], "Already voted");
        hasVoted[proposalId][msg.sender] = true;
        proposals[proposalId].votes++;
    }
    
    function executeProposal(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.votes >= 100, "Insufficient votes"); // Example threshold
        require(!proposal.executed, "Already executed");
        
        proposal.executed = true;
        
        // Execute cross-chain call
        _executeCrossChain(proposal.callData);
    }
    
    function _executeCrossChain(bytes memory callData) internal {
        // Send via CCIP
    }
}
```

## Fee Calculation

```solidity
contract CCIPFeeCalculator {
    IRouterClient public router;
    
    function calculateFee(
        uint64 destinationChainSelector,
        address receiver,
        bytes memory message
    ) external view returns (uint256) {
        Client.EVM2AnyMessage memory evmMessage = Client.EVM2AnyMessage({
            receiver: abi.encode(receiver),
            data: message,
            tokenAmounts: new Client.EVMTokenAmount[](0),
            extraArgs: Client._argsToBytes(
                Client.EVMExtraArgsV1({gasLimit: 200_000})
            ),
            feeToken: address(0)
        });
        
        return router.getFee(destinationChainSelector, evmMessage);
    }
}
```

## Supported Networks

| Network | Chain Selector | Status |
|---------|---------------|--------|
| Ethereum | 5009297550715157269 | Active |
| Polygon | 4051577828743386545 | Active |
| Avalanche | 6433500567565415381 | Active |
| XDC | TBD | Pending |

## Security Considerations

1. **Message Validation**: Always verify sender on destination chain
2. **Rate Limiting**: Prevent spam and DoS
3. **Fee Management**: Ensure sufficient fees for delivery
4. **Error Handling**: Handle failed cross-chain messages
5. **Timelocks**: Add delays for sensitive operations

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| "CCIP failed" | Insufficient fees | Calculate and send correct fees |
| "Message not received" | Network congestion | Wait for confirmation |
| "Invalid sender" | Wrong address encoding | Verify address format |
| "High gas costs" | Large message payload | Compress data |
