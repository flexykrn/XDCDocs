# MEV Protection: Front-Running and Sandwich Attack Mitigation on XDC

Maximal Extractable Value (MEV) represents the profit extractable by manipulating transaction ordering within a block. While traditionally associated with Ethereum, MEV exists on any blockchain with decentralized exchange activity, including XDC Network. This guide provides comprehensive documentation on MEV concepts, attack vectors, protection strategies, and implementation patterns specifically for the XDC ecosystem.

---

## Overview

### What Is MEV

MEV refers to the maximum value that can be extracted from block production beyond standard block rewards and gas fees. It arises from the ability of block producers (validators, miners, or sequencers) to include, exclude, or reorder transactions within a block.

**Core Mechanism:**

1. Transactions sit in the mempool (pending transaction pool) before inclusion
2. Block producers (masternodes on XDC) select and order transactions
3. Sophisticated actors monitor pending transactions for profit opportunities
4. These actors submit their own transactions with higher gas prices to front-run or back-run victim transactions
5. The extracted value comes from the victim's transaction being executed at a worse price

**MEV Extraction Flow:**

```
Victim submits: "Swap 1000 XDC for USDC at current price"
MEV Bot sees transaction in mempool
MEV Bot submits: "Swap 1000 XDC for USDC" (higher gas price)
MEV Bot submits: "Swap USDC back to XDC" (lower gas price)
Block order: MEV Buy → Victim Buy → MEV Sell
Result: Victim gets worse price; MEV Bot captures difference
```

### MEV on XDC Network

XDC's consensus mechanism (XDPoS) creates unique MEV characteristics:

**XDC-Specific Factors:**

| Factor | XDC Characteristic | MEV Impact |
|--------|-------------------|------------|
| Block Time | 2 seconds | Faster extraction cycles |
| Consensus | Delegated Proof of Stake | Masternode operators can extract |
| Gas Price | ~0.25 Gwei | Low-cost spam and extraction |
| Block Gas Limit | 50M | More transactions per block |
| Validator Count | 108 masternodes | Limited extraction points |

**Current MEV Landscape:**

- **DEX Activity:** Any DEX on XDC (XSwap, Globiance) is vulnerable
- **Arbitrage:** Cross-DEX and cross-chain price discrepancies
- **Liquidations:** Lending protocol liquidations
- **NFT Sniping:** Front-running NFT purchases
- **Bridge Transactions:** Cross-chain message front-running

### Economic Impact

**User Losses:**

- **Slippage Costs:** Users receive worse execution prices
- **Failed Transactions:** Transactions revert due to price movement
- **Gas Waste:** Failed transactions still consume gas
- **Trust Erosion:** Users abandon protocols with poor execution

**Protocol Impact:**

- **Reduced Volume:** Traders migrate to protected platforms
- **Reputation Damage:** Protocols seen as unfair lose market share
- **TVL Decline:** Liquidity providers withdraw due to impermanent loss manipulation

---

## Attack Types

### Front-Running

**Definition:** An attacker observes a pending transaction and submits an identical or competing transaction with a higher gas price, ensuring their transaction executes first.

**Scenario:**

```
1. Alice submits: "Buy Token A with 1000 XDC" (gas price: 0.25 Gwei)
2. MEV Bot detects Alice's transaction
3. MEV Bot submits: "Buy Token A with 1000 XDC" (gas price: 0.30 Gwei)
4. Block producer orders: MEV Bot first, Alice second
5. MEV Bot buys at $1.00, Alice buys at $1.05
6. MEV Bot immediately sells at $1.05, capturing $50 profit
```

**Impact:** Alice receives 5% fewer tokens than expected.

### Back-Running

**Definition:** An attacker places a transaction immediately after a victim's transaction to profit from the price impact caused by the victim.

**Scenario:**

```
1. Whale submits: "Buy 1,000,000 Token A" (large price impact)
2. Whale's transaction executes, price moves +10%
3. MEV Bot submits: "Sell Token A immediately after"
4. MEV Bot captures the price increase caused by whale
```

**Impact:** Whale experiences worse execution; MEV Bot captures price impact.

### Sandwich Attacks

**Definition:** The most profitable MEV strategy. The attacker places a buy order before the victim and a sell order after, "sandwiching" the victim's transaction.

**Complete Flow:**

```
Victim intends to buy: "Swap 10,000 XDC → Token A"

MEV Bot Actions:
1. Front-run: "Swap XDC → Token A" (pushes price up 3%)
2. Victim's transaction executes (buys at +3% price)
3. Back-run: "Swap Token A → XDC" (sells at +3% price)

Result:
- MEV Bot profit: ~3% of trade size minus gas costs
- Victim loss: ~3% slippage on entire trade
```

**Profitability:** Sandwich attacks are highly profitable for large trades on low-liquidity pools.

### Arbitrage MEV

**Definition:** Exploiting price differences between markets. Not inherently harmful but can be extracted by MEV bots before honest arbitrageurs.

**Types:**

- **Cross-DEX Arbitrage:** Different prices on XSwap vs Globiance
- **Cross-Chain Arbitrage:** Price differences between XDC and Ethereum DEXs
- **CEX-DEX Arbitrage:** Price differences between centralized and decentralized exchanges

**Impact:** Arbitrage is economically beneficial (price alignment) but MEV extraction adds cost.

### Liquidation MEV

**Definition:** Front-running liquidations in lending protocols to capture liquidation bonuses.

**Scenario:**

```
1. Borrower's collateral drops below threshold
2. Liquidator A submits liquidation transaction
3. MEV Bot front-runs with higher gas price
4. MEV Bot captures liquidation bonus
5. Liquidator A's transaction reverts (already liquidated)
```

**Impact:** Honest liquidators are discouraged; protocol health monitoring suffers.

### Time-Bandit Attacks

**Definition:** A block producer (masternode) reorganizes recent blocks to capture MEV opportunities, potentially causing double-spends or transaction reversals.

**Risk on XDC:**

- XDPoS finality reduces but doesn't eliminate reorganization risk
- Masternodes have brief windows to reorganize before checkpointing
- Lower stake requirements than Ethereum reduce attack cost

---

## Protection Strategies

### Slippage Protection

The simplest and most widely implemented MEV protection. Users specify the maximum price deviation they will accept.

**Implementation:**

```solidity
contract ProtectedDEX {
    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut  // Slippage protection
    ) external {
        uint256 expectedOut = getExpectedOutput(tokenIn, tokenOut, amountIn);
        
        // Ensure minimum output meets user's requirement
        require(expectedOut >= minAmountOut, "Slippage exceeded");
        
        // Execute swap
        _executeSwap(tokenIn, tokenOut, amountIn, expectedOut);
    }
}
```

**Recommended Slippage Tolerances:**

| Trade Size | Liquidity | Recommended Slippage |
|------------|-----------|---------------------|
| < $1,000 | High | 0.5% |
| $1,000 - $10,000 | High | 1.0% |
| $10,000 - $100,000 | Medium | 2.0% |
| > $100,000 | Any | 3.0%+ or split trades |

**User Interface Guidance:**

```javascript
function calculateMinOutput(amountIn, expectedOut, slippagePercent) {
    return expectedOut * (100 - slippagePercent) / 100;
}

// Example
const minOut = calculateMinOutput(1000, 950, 1.0); // 940.5 minimum
```

### Commit-Reveal Schemes

A cryptographic approach where users commit to an action without revealing details, then reveal and execute later.

**Two-Phase Process:**

```solidity
contract CommitRevealSwap {
    struct Commitment {
        bytes32 hash;
        uint256 blockNumber;
        bool revealed;
    }
    
    mapping(address => Commitment) public commitments;
    uint256 public constant REVEAL_DELAY = 5; // blocks
    
    // Phase 1: Commit
    function commit(bytes32 _hash) external {
        commitments[msg.sender] = Commitment({
            hash: _hash,
            blockNumber: block.number,
            revealed: false
        });
    }
    
    // Phase 2: Reveal and execute
    function reveal(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minOut,
        bytes32 secret
    ) external {
        Commitment storage commit = commitments[msg.sender];
        require(!commit.revealed, "Already revealed");
        require(block.number >= commit.blockNumber + REVEAL_DELAY, "Too early");
        
        // Verify commitment
        bytes32 hash = keccak256(abi.encodePacked(
            tokenIn, tokenOut, amountIn, minOut, secret
        ));
        require(hash == commit.hash, "Invalid reveal");
        
        commit.revealed = true;
        _executeSwap(tokenIn, tokenOut, amountIn, minOut);
    }
}
```

**Advantages:**

- MEV bots cannot see transaction details during commitment phase
- Forces attackers to commit capital without knowing details

**Disadvantages:**

- Poor user experience (two transactions)
- Capital locked during reveal period
- Price can still move during delay

### Time-Weighted Average Pricing (TWAP)

Use historical average prices rather than spot prices to reduce manipulation.

**Implementation:**

```solidity
contract TWAPOracle {
    struct PricePoint {
        uint256 price;
        uint256 timestamp;
    }
    
    PricePoint[] public priceHistory;
    uint256 public constant TWAP_WINDOW = 1 hours;
    
    function updatePrice(uint256 newPrice) external {
        priceHistory.push(PricePoint({
            price: newPrice,
            timestamp: block.timestamp
        }));
        
        // Remove old entries
        while (priceHistory.length > 0 && 
               priceHistory[0].timestamp < block.timestamp - TWAP_WINDOW) {
            // Shift array (gas expensive - use circular buffer in production)
            for (uint i = 0; i < priceHistory.length - 1; i++) {
                priceHistory[i] = priceHistory[i + 1];
            }
            priceHistory.pop();
        }
    }
    
    function getTWAP() external view returns (uint256) {
        require(priceHistory.length > 0, "No prices");
        
        uint256 sum;
        for (uint i = 0; i < priceHistory.length; i++) {
            sum += priceHistory[i].price;
        }
        return sum / priceHistory.length;
    }
}
```

**Usage in DEX:**

```solidity
function swapWithTWAP(
    address tokenIn,
    address tokenOut,
    uint256 amountIn,
    uint256 maxDeviation  // Max deviation from TWAP
) external {
    uint256 spotPrice = getSpotPrice(tokenIn, tokenOut);
    uint256 twapPrice = twapOracle.getTWAP();
    
    uint256 deviation = spotPrice > twapPrice 
        ? (spotPrice - twapPrice) * 100 / twapPrice
        : (twapPrice - spotPrice) * 100 / twapPrice;
    
    require(deviation <= maxDeviation, "Price manipulation detected");
    
    _executeSwap(tokenIn, tokenOut, amountIn);
}
```

**Advantages:**

- Resistant to single-block manipulation
- Smooths out volatile price movements

**Disadvantages:**

- Lagging indicator (slow to react to legitimate price changes)
- Historical data storage costs gas

### Batch Auctions

Instead of executing trades immediately, collect orders over a time period and execute all at once at a uniform clearing price.

**Process:**

```
1. Orders collected for 5-minute window
2. All orders batched together
3. Single clearing price calculated
4. All trades execute simultaneously
5. No transaction ordering advantage
```

**Implementation Concept:**

```solidity
contract BatchAuctionDEX {
    struct Order {
        address trader;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 minOut;
    }
    
    Order[] public currentBatch;
    uint256 public batchEndTime;
    uint256 public constant BATCH_DURATION = 5 minutes;
    
    function submitOrder(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minOut
    ) external {
        if (block.timestamp >= batchEndTime) {
            _settleBatch();
        }
        
        currentBatch.push(Order({
            trader: msg.sender,
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            amountIn: amountIn,
            minOut: minOut
        }));
    }
    
    function _settleBatch() internal {
        // Calculate uniform clearing price
        // Execute all orders at clearing price
        // Reset batch
        delete currentBatch;
        batchEndTime = block.timestamp + BATCH_DURATION;
    }
}
```

**Advantages:**

- Eliminates ordering advantage entirely
- Fair price discovery

**Disadvantages:**

- Delayed execution
- Complex implementation
- Requires significant liquidity

### Private Mempools

Submit transactions directly to block producers without broadcasting to the public mempool.

**XDC Implementation:**

Since XDC has 108 masternodes, private submission requires relationships with validators:

```javascript
// Direct RPC submission to specific masternode
const provider = new ethers.JsonRpcProvider("https://masternode1.xinfin.network");

const tx = {
    to: dexAddress,
    data: swapData,
    gasPrice: await provider.getGasPrice(),
    gasLimit: 200000
};

// Submit directly (not broadcast to mempool)
const response = await provider.send("eth_sendTransaction", [tx]);
```

**Challenges on XDC:**

- Masternode operators may not offer private submission APIs
- Centralization concerns if only some masternodes offer service
- Requires direct relationships with validators

### Gas Price Strategies

**Uniform Gas Price:**

All transactions in a batch use the same gas price, removing gas price as an ordering mechanism.

```solidity
function executeWithFixedGas(
    bytes[] calldata transactions,
    uint256 fixedGasPrice
) external {
    require(tx.gasprice == fixedGasPrice, "Invalid gas price");
    // Execute transactions in random order
}
```

**Priority Fee Caps:**

Limit maximum priority fee to prevent gas price wars.

```javascript
const tx = {
    type: 2,  // EIP-1559
    maxFeePerGas: ethers.parseUnits("0.5", "gwei"),
    maxPriorityFeePerGas: ethers.parseUnits("0.1", "gwei"),
    // ...
};
```

---

## Implementation Examples

### Protected DEX Router

Complete implementation combining multiple protection strategies:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ProtectedRouter is ReentrancyGuard, Ownable {
    // Protection parameters
    uint256 public constant MAX_SLIPPAGE = 300; // 3% in basis points
    uint256 public constant MIN_TWAP_POINTS = 10;
    uint256 public constant DEVIATION_THRESHOLD = 200; // 2%
    
    // TWAP storage
    struct PricePoint {
        uint256 price;
        uint256 timestamp;
    }
    mapping(address => PricePoint[]) public priceHistory;
    
    // Events
    event SwapProtected(
        address indexed user,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 slippage
    );
    
    event ManipulationDetected(
        address indexed token,
        uint256 spotPrice,
        uint256 twapPrice,
        uint256 deviation
    );

    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external nonReentrant returns (uint256[] memory amounts) {
        require(block.timestamp <= deadline, "Expired");
        require(path.length >= 2, "Invalid path");
        
        address tokenIn = path[0];
        address tokenOut = path[path.length - 1];
        
        // 1. Calculate expected output
        uint256 expectedOut = getAmountsOut(amountIn, path)[path.length - 1];
        
        // 2. Slippage check
        uint256 slippage = ((expectedOut - amountOutMin) * 10000) / expectedOut;
        require(slippage <= MAX_SLIPPAGE, "Slippage too high");
        
        // 3. TWAP deviation check
        uint256 spotPrice = getSpotPrice(tokenIn, tokenOut);
        uint256 twapPrice = getTWAP(tokenIn, tokenOut);
        
        if (twapPrice > 0) {
            uint256 deviation = spotPrice > twapPrice 
                ? ((spotPrice - twapPrice) * 10000) / twapPrice
                : ((twapPrice - spotPrice) * 10000) / twapPrice;
            
            if (deviation > DEVIATION_THRESHOLD) {
                emit ManipulationDetected(tokenOut, spotPrice, twapPrice, deviation);
                require(deviation <= DEVIATION_THRESHOLD * 2, "Extreme manipulation");
            }
        }
        
        // 4. Execute swap
        amounts = _executeSwap(amountIn, path, to);
        
        // 5. Post-execution verification
        require(amounts[path.length - 1] >= amountOutMin, "Insufficient output");
        
        emit SwapProtected(
            msg.sender,
            tokenIn,
            tokenOut,
            amountIn,
            amounts[path.length - 1],
            slippage
        );
        
        return amounts;
    }
    
    function getTWAP(address tokenA, address tokenB) public view returns (uint256) {
        address pair = pairFor(tokenA, tokenB);
        PricePoint[] storage history = priceHistory[pair];
        
        if (history.length < MIN_TWAP_POINTS) return 0;
        
        uint256 sum;
        uint256 count;
        uint256 cutoff = block.timestamp - 1 hours;
        
        for (uint i = history.length; i > 0 && count < MIN_TWAP_POINTS; i--) {
            if (history[i - 1].timestamp >= cutoff) {
                sum += history[i - 1].price;
                count++;
            }
        }
        
        return count > 0 ? sum / count : 0;
    }
    
    function _executeSwap(
        uint256 amountIn,
        address[] calldata path,
        address to
    ) internal returns (uint256[] memory) {
        // DEX swap implementation
    }
    
    function getAmountsOut(uint256 amountIn, address[] calldata path) 
        public view returns (uint256[] memory) {
        // Price calculation
    }
    
    function getSpotPrice(address tokenA, address tokenB) 
        public view returns (uint256) {
        // Current spot price
    }
    
    function pairFor(address tokenA, address tokenB) 
        internal pure returns (address) {
        // Pair address calculation
    }
}
```

### MEV-Resistant Oracle

```solidity
contract ResistantOracle {
    struct Observation {
        uint256 timestamp;
        uint256 price;
        uint256 blockNumber;
    }
    
    Observation[] public observations;
    uint256 public constant MIN_OBSERVATIONS = 20;
    uint256 public constant MAX_DEVIATION = 500; // 5%
    
    function addObservation(uint256 price) external {
        // Validate against median to prevent manipulation
        if (observations.length >= MIN_OBSERVATIONS) {
            uint256 median = getMedian();
            uint256 deviation = price > median 
                ? (price - median) * 10000 / median
                : (median - price) * 10000 / median;
            
            require(deviation <= MAX_DEVIATION, "Price deviation too high");
        }
        
        observations.push(Observation({
            timestamp: block.timestamp,
            price: price,
            blockNumber: block.number
        }));
        
        // Keep only last 100 observations
        if (observations.length > 100) {
            // Remove oldest (inefficient - use circular buffer in production)
        }
    }
    
    function getMedian() public view returns (uint256) {
        require(observations.length >= MIN_OBSERVATIONS, "Insufficient data");
        
        uint256[] memory prices = new uint256[](observations.length);
        for (uint i = 0; i < observations.length; i++) {
            prices[i] = observations[i].price;
        }
        
        // Sort and find median
        _sort(prices);
        return prices[prices.length / 2];
    }
    
    function _sort(uint256[] memory arr) internal pure {
        // Quick sort implementation
    }
}
```

---

## DEX Design Patterns

### Concentrated Liquidity (like Uniswap V3)

Concentrated liquidity reduces MEV by:

- Tighter spreads reduce arbitrage opportunities
- Active liquidity management reduces stale pricing
- Limit-order-like behavior gives users more control

### Dynamic Fees

Adjust fees based on volatility to compensate LPs for MEV losses:

```solidity
function getDynamicFee() public view returns (uint256) {
    uint256 volatility = calculateVolatility();
    
    if (volatility < 100) return 30;      // 0.3% base fee
    if (volatility < 500) return 50;      // 0.5%
    if (volatility < 1000) return 100;    // 1%
    return 200;                            // 2% high volatility
}
```

### MEV-Aware AMM Design

**Time-Weighted AMM:**

```solidity
contract TimeWeightedAMM {
    uint256 public lastTradeBlock;
    uint256 public constant COOLDOWN = 2; // blocks
    
    function swap(uint256 amountIn, address tokenIn) external {
        require(
            block.number >= lastTradeBlock + COOLDOWN,
            "Trade cooldown active"
        );
        
        lastTradeBlock = block.number;
        _executeSwap(amountIn, tokenIn);
    }
}
```

---

## Monitoring and Detection

### MEV Detection Metrics

**Key Indicators:**

| Metric | Normal | Suspicious | Attack |
|--------|--------|------------|--------|
| Slippage | < 1% | 1-3% | > 3% |
| Gas Price Spike | Baseline | 2x | 5x+ |
| Same-Block Trades | Few | Several | Many |
| Price Reversal | Gradual | Quick | Immediate |
| Transaction Ordering | Random | Clustered | Sandwich |

### Monitoring Implementation

```javascript
const { ethers } = require("ethers");

class MEVMonitor {
    constructor(provider) {
        this.provider = provider;
        this.suspiciousPatterns = [];
    }
    
    async monitorBlock(blockNumber) {
        const block = await this.provider.getBlock(blockNumber, true);
        const transactions = block.prefetchedTransactions;
        
        // Detect sandwich patterns
        for (let i = 1; i < transactions.length - 1; i++) {
            const prev = transactions[i - 1];
            const curr = transactions[i];
            const next = transactions[i + 1];
            
            if (this.isSandwich(prev, curr, next)) {
                this.suspiciousPatterns.push({
                    type: "sandwich",
                    block: blockNumber,
                    victim: curr.hash,
                    attacker: [prev.hash, next.hash]
                });
            }
        }
    }
    
    isSandwich(prev, curr, next) {
        // Check if prev and next are from same address
        // Check if they interact with same DEX
        // Check if prev buys and next sells same token
        return prev.from === next.from && 
               this.isDEXInteraction(prev.to) &&
               this.isDEXInteraction(next.to) &&
               this.isOppositeDirection(prev, next);
    }
    
    async generateReport() {
        return {
            totalBlocks: this.blocksProcessed,
            suspiciousPatterns: this.suspiciousPatterns.length,
            estimatedLoss: this.calculateLoss(),
            topAttackerAddresses: this.getTopAttackers()
        };
    }
}
```

### Alerting System

```solidity
contract MEVAlert {
    event SuspiciousActivity(
        string activityType,
        address indexed victim,
        address indexed attacker,
        uint256 loss,
        uint256 blockNumber
    );
    
    function reportSandwich(
        address victim,
        address attacker,
        uint256 estimatedLoss
    ) external {
        emit SuspiciousActivity(
            "sandwich",
            victim,
            attacker,
            estimatedLoss,
            block.number
        );
    }
}
```

---

## Best Practices

### For DEX Developers

1. **Implement Slippage Protection:** Mandatory minimum output parameters
2. **Use TWAP Oracles:** Resist single-block manipulation
3. **Add Cooldown Periods:** Prevent rapid-fire attacks
4. **Dynamic Fees:** Adjust for market conditions
5. **MEV Monitoring:** Track and alert on suspicious patterns
6. **Transparency:** Publish MEV metrics and protection measures

### For Protocol Developers

1. **Batch Operations:** Group user actions to reduce individual exposure
2. **Commit-Reveal:** For high-value operations
3. **Price Impact Limits:** Reject transactions with excessive impact
4. **Emergency Pause:** Circuit breakers for extreme conditions
5. **Regular Audits:** Include MEV resistance in security audits

### For Users

1. **Set Slippage Carefully:** Balance protection with execution likelihood
2. **Split Large Trades:** Reduce per-trade MEV exposure
3. **Avoid Peak Times:** Trade during low-activity periods
4. **Use Protected Protocols:** Choose DEXs with MEV protection
5. **Monitor Transactions:** Check execution prices vs expected

### For Validators/Masternodes

1. **Fair Ordering:** Implement first-come-first-served ordering
2. **Private Submission:** Offer private mempool services
3. **Transparency:** Publish block construction policies
4. **Anti-Collusion:** Prevent MEV extraction partnerships

---

## XDC-Specific Considerations

### XDPoS and MEV

XDC's consensus has unique MEV characteristics:

**Masternode Rotation:**

- 108 masternodes rotate block production
- Each masternode produces blocks for a defined period
- MEV extraction limited to current block producer

**Checkpointing:**

- Finality achieved every 450 blocks
- Reduces reorganization risk after checkpoint
- MEV extraction window limited between checkpoints

### Building MEV Protection on XDC

**Advantages:**

- Lower gas costs make protection mechanisms cheaper
- Faster block times reduce extraction windows
- Smaller validator set enables coordination

**Challenges:**

- Limited private mempool infrastructure
- Less mature MEV tooling compared to Ethereum
- Smaller liquidity pools increase slippage risk

### Apothem Testnet Testing

Test MEV protection on Apothem before mainnet:

```javascript
// Apothem testnet configuration
const provider = new ethers.JsonRpcProvider("https://rpc.apothem.network");

// Deploy test contracts
const dex = await deployDEX(provider);

// Simulate MEV attack
const attacker = new MEVBot(provider);
await attacker.simulateSandwich(dex.address, victimTx);

// Verify protection effectiveness
const protection = await dex.getProtectionMetrics();
console.log("Protection rate:", protection.effectiveness);
```

---

## Related Topics

- [Smart Contract Security](../security/overview.md): General security practices
- [DEX Development](../smartcontract/index.md): Building decentralized exchanges
- [Gas Optimization](../smartcontract/gas-optimization.md): Optimizing protection mechanisms
- [Oracle Integration](../api/index.md): Price feed integration
- [Validator Security](../security/validator-security.md): Masternode security considerations
- [XDC Architecture](../learn/xdc-architecture.md): Understanding XDPoS consensus
