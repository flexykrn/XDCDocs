---
title: DeFi Integration Guide — Build Decentralized Finance Protocols on XDC
description: Complete DeFi guide for XDC — DEX integration, AMM mechanics, liquidity provision, lending protocols, yield farming, and flash loans.
---

Difficulty: Advanced | Time: ~40 minutes | Tools: Hardhat/Foundry, OpenZeppelin, ethers.js

# DeFi Integration Guide — Build Decentralized Finance Protocols on XDC

Decentralized Finance (DeFi) is the cornerstone of modern blockchain ecosystems. This guide covers building and integrating with DeFi protocols on XDC, from DEX mechanics to advanced yield strategies.

## Prerequisites

- [Hardhat Guide](../smartcontract/hardhat.md) or [Foundry Guide](../smartcontract/foundry.md) completed
- [Token Standards](../smartcontract/tokens/index.md) — understanding of XRC20 and XRC721
- [Oracle Integration Guide](../oracle/oracle.md) (recommended for price feeds)
- Basic understanding of financial instruments and market mechanics

---

## DeFi Concepts on XDC

### Why DeFi on XDC

XDC offers unique advantages for DeFi protocols:

| Advantage | XDC Benefit | Impact |
|-----------|-------------|--------|
| **Transaction Speed** | 2-second finality | Near-instant trades |
| **Low Gas Costs** | ~$0.0001 per transaction | Profitable micro-strategies |
| **Enterprise Ready** | ISO 20022 compliant | Institutional adoption |
| **Cross-Chain** | XDC Interoperability | Multi-chain liquidity |
| **Stable Network** | 99.9% uptime | Reliable operations |

### Available Protocols

Current DeFi landscape on XDC:

| Protocol | Type | Status | Website |
|----------|------|--------|---------|
| **Globiance** | DEX | Live | globiance.com |
| **XDC DeFi** | Lending | In Development | - |
| **Prime Numbers** | NFT + DeFi | Live | primenumbers.xyz |
| **StorX** | Storage + DeFi | Live | storx.tech |

### Liquidity Mechanisms

**Automated Market Makers (AMM)**:
- Constant product formula: `x * y = k`
- No order book needed
- Liquidity providers earn fees
- Slippage based on pool depth

**Order Book DEX**:
- Traditional matching engine
- Limit and market orders
- Requires high throughput
- Better for large trades

**Hybrid Models**:
- Combine AMM and order book
- Off-chain matching, on-chain settlement
- Best of both worlds

### Yield Strategies

| Strategy | Risk Level | APY Range | Complexity |
|----------|------------|-----------|------------|
| **Liquidity Provision** | Medium | 5-50% | Low |
| **Yield Farming** | High | 20-200% | Medium |
| **Staking** | Low | 5-15% | Low |
| **Lending** | Low-Medium | 3-10% | Low |
| **Flash Loans** | Very High | Variable | High |
| **Arbitrage** | Medium | 1-5% per trade | High |

### Risk Management

DeFi risks and mitigations:

| Risk | Description | Mitigation |
|------|-------------|------------|
| **Impermanent Loss** | LP value vs holding | Choose stable pairs, hedging |
| **Smart Contract Risk** | Bugs, exploits | Audits, insurance |
| **Oracle Manipulation** | Price feed attacks | Multi-oracle, TWAP |
| **Liquidation Risk** | Collateral shortfall | Over-collateralization |
| **Gas Price Risk** | Failed transactions | Gas optimization, buffers |
| **Regulatory Risk** | Compliance changes | Legal review, KYC |

---

## DEX Integration

### AMM Mechanics

Constant product market maker:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract SimpleAMM {
    // Token reserves
    uint256 public reserveA;
    uint256 public reserveB;
    
    // Constant product
    uint256 public constantK;
    
    // Liquidity tokens
    mapping(address => uint256) public liquidityBalance;
    uint256 public totalLiquidity;
    
    // Fee: 0.3% = 3/1000
    uint256 public constant FEE_NUMERATOR = 3;
    uint256 public constant FEE_DENOMINATOR = 1000;
    
    event Swap(address indexed user, address tokenIn, uint256 amountIn, uint256 amountOut);
    event LiquidityAdded(address indexed provider, uint256 amountA, uint256 amountB, uint256 liquidity);
    event LiquidityRemoved(address indexed provider, uint256 amountA, uint256 amountB, uint256 liquidity);
    
    function addLiquidity(uint256 amountA, uint256 amountB) external returns (uint256 liquidity) {
        require(amountA > 0 && amountB > 0, "Invalid amounts");
        
        if (totalLiquidity == 0) {
            liquidity = sqrt(amountA * amountB);
        } else {
            liquidity = min(
                (amountA * totalLiquidity) / reserveA,
                (amountB * totalLiquidity) / reserveB
            );
        }
        
        require(liquidity > 0, "Insufficient liquidity minted");
        
        reserveA += amountA;
        reserveB += amountB;
        constantK = reserveA * reserveB;
        
        liquidityBalance[msg.sender] += liquidity;
        totalLiquidity += liquidity;
        
        emit LiquidityAdded(msg.sender, amountA, amountB, liquidity);
        return liquidity;
    }
    
    function swapAForB(uint256 amountAIn) external returns (uint256 amountBOut) {
        require(amountAIn > 0, "Invalid amount");
        
        // Calculate amount out with fee
        uint256 amountAInWithFee = amountAIn * (FEE_DENOMINATOR - FEE_NUMERATOR);
        amountBOut = (reserveB * amountAInWithFee) / (reserveA * FEE_DENOMINATOR + amountAInWithFee);
        
        require(amountBOut > 0, "Insufficient output");
        require(amountBOut < reserveB, "Insufficient liquidity");
        
        reserveA += amountAIn;
        reserveB -= amountBOut;
        constantK = reserveA * reserveB;
        
        emit Swap(msg.sender, address(tokenA), amountAIn, amountBOut);
        return amountBOut;
    }
    
    function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) 
        public pure returns (uint256 amountOut) 
    {
        require(amountIn > 0, "Invalid amount");
        require(reserveIn > 0 && reserveOut > 0, "Invalid reserves");
        
        uint256 amountInWithFee = amountIn * 997;
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = (reserveIn * 1000) + amountInWithFee;
        amountOut = numerator / denominator;
    }
    
    function sqrt(uint256 x) internal pure returns (uint256 y) {
        uint256 z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }
    
    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }
}
```

### Liquidity Provision

Add liquidity to a DEX pool:

```javascript title="scripts/add-liquidity.js"
const hre = require("hardhat");

async function addLiquidity() {
    const [deployer] = await hre.ethers.getSigners();
    
    const routerAddress = "ROUTER_CONTRACT_ADDRESS";
    const tokenA = "TOKEN_A_ADDRESS";
    const tokenB = "TOKEN_B_ADDRESS";
    
    const router = await hre.ethers.getContractAt("IRouter", routerAddress);
    const tokenAContract = await hre.ethers.getContractAt("IERC20", tokenA);
    const tokenBContract = await hre.ethers.getContractAt("IERC20", tokenB);
    
    const amountA = hre.ethers.parseEther("1000");
    const amountB = hre.ethers.parseEther("1000");
    
    // Approve tokens
    await tokenAContract.approve(routerAddress, amountA);
    await tokenBContract.approve(routerAddress, amountB);
    
    // Add liquidity
    const tx = await router.addLiquidity(
        tokenA,
        tokenB,
        amountA,
        amountB,
        0, // minAmountA (slippage protection)
        0, // minAmountB
        deployer.address,
        Math.floor(Date.now() / 1000) + 300 // deadline: 5 minutes
    );
    
    const receipt = await tx.wait();
    console.log(`Liquidity added! TX: ${receipt.hash}`);
    
    // Get LP tokens
    const pairAddress = await router.getPair(tokenA, tokenB);
    const pair = await hre.ethers.getContractAt("IPair", pairAddress);
    const lpBalance = await pair.balanceOf(deployer.address);
    console.log(`LP tokens received: ${hre.ethers.formatEther(lpBalance)}`);
}

addLiquidity().catch(console.error);
```

### Swap Integration

Execute token swaps:

```javascript title="scripts/swap.js"
const hre = require("hardhat");

async function swap() {
    const [deployer] = await hre.ethers.getSigners();
    
    const routerAddress = "ROUTER_CONTRACT_ADDRESS";
    const tokenIn = "TOKEN_IN_ADDRESS";
    const tokenOut = "TOKEN_OUT_ADDRESS";
    
    const router = await hre.ethers.getContractAt("IRouter", routerAddress);
    const tokenContract = await hre.ethers.getContractAt("IERC20", tokenIn);
    
    const amountIn = hre.ethers.parseEther("100");
    
    // Approve router
    await tokenContract.approve(routerAddress, amountIn);
    
    // Get expected output
    const amounts = await router.getAmountsOut(amountIn, [tokenIn, tokenOut]);
    const expectedOut = amounts[amounts.length - 1];
    const minOut = (expectedOut * 95n) / 100n; // 5% slippage tolerance
    
    // Execute swap
    const tx = await router.swapExactTokensForTokens(
        amountIn,
        minOut,
        [tokenIn, tokenOut],
        deployer.address,
        Math.floor(Date.now() / 1000) + 300
    );
    
    const receipt = await tx.wait();
    console.log(`Swap complete! TX: ${receipt.hash}`);
    console.log(`Expected output: ${hre.ethers.formatEther(expectedOut)}`);
}

swap().catch(console.error);
```

### Price Oracle Usage

Use DEX as price oracle (with caution):

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IPair {
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
    function token0() external view returns (address);
    function token1() external view returns (address);
}

contract DEXPriceOracle {
    address public pair;
    address public token0;
    address public token1;
    
    constructor(address _pair) {
        pair = _pair;
        token0 = IPair(_pair).token0();
        token1 = IPair(_pair).token1();
    }
    
    function getPrice() public view returns (uint256 price) {
        (uint112 reserve0, uint112 reserve1, ) = IPair(pair).getReserves();
        
        // Price of token1 in terms of token0
        price = (uint256(reserve0) * 1e18) / uint256(reserve1);
    }
    
    // TWAP (Time-Weighted Average Price) for manipulation resistance
    uint256 public priceCumulativeLast;
    uint32 public blockTimestampLast;
    
    function updateTWAP() external {
        (uint112 reserve0, uint112 reserve1, uint32 blockTimestamp) = IPair(pair).getReserves();
        
        uint256 timeElapsed = blockTimestamp - blockTimestampLast;
        if (timeElapsed > 0) {
            priceCumulativeLast += ((uint256(reserve0) * 1e18) / uint256(reserve1)) * timeElapsed;
            blockTimestampLast = blockTimestamp;
        }
    }
    
    function getTWAP(uint256 duration) external view returns (uint256) {
        return priceCumulativeLast / duration;
    }
}
```

---

## Lending Protocols

### Collateral Mechanics

Over-collateralized lending:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract SimpleLending is ReentrancyGuard {
    struct Market {
        IERC20 token;
        uint256 totalSupply;
        uint256 totalBorrows;
        uint256 supplyRate; // APY * 100 (e.g., 500 = 5%)
        uint256 borrowRate; // APY * 100
        uint256 collateralFactor; // 0-10000 (e.g., 7500 = 75%)
    }
    
    struct UserAccount {
        uint256 supplied;
        uint256 borrowed;
        uint256 lastUpdate;
    }
    
    mapping(address => Market) public markets;
    mapping(address => mapping(address => UserAccount)) public accounts;
    
    uint256 public constant LIQUIDATION_INCENTIVE = 500; // 5%
    uint256 public constant LIQUIDATION_THRESHOLD = 8000; // 80%
    
    event Supply(address indexed user, address indexed token, uint256 amount);
    event Borrow(address indexed user, address indexed token, uint256 amount);
    event Repay(address indexed user, address indexed token, uint256 amount);
    event Withdraw(address indexed user, address indexed token, uint256 amount);
    event Liquidate(address indexed liquidator, address indexed borrower, address indexed token, uint256 amount);
    
    function supply(address token, uint256 amount) external nonReentrant {
        Market storage market = markets[token];
        require(address(market.token) != address(0), "Market not listed");
        
        UserAccount storage account = accounts[msg.sender][token];
        _accrueInterest(account, market);
        
        market.token.transferFrom(msg.sender, address(this), amount);
        account.supplied += amount;
        market.totalSupply += amount;
        
        emit Supply(msg.sender, token, amount);
    }
    
    function borrow(address token, uint256 amount) external nonReentrant {
        Market storage market = markets[token];
        require(address(market.token) != address(0), "Market not listed");
        
        UserAccount storage account = accounts[msg.sender][token];
        _accrueInterest(account, market);
        
        require(_isHealthy(msg.sender, token, amount), "Insufficient collateral");
        
        account.borrowed += amount;
        market.totalBorrows += amount;
        market.token.transfer(msg.sender, amount);
        
        emit Borrow(msg.sender, token, amount);
    }
    
    function repay(address token, uint256 amount) external nonReentrant {
        Market storage market = markets[token];
        UserAccount storage account = accounts[msg.sender][token];
        
        _accrueInterest(account, market);
        
        uint256 repayAmount = amount > account.borrowed ? account.borrowed : amount;
        account.borrowed -= repayAmount;
        market.totalBorrows -= repayAmount;
        market.token.transferFrom(msg.sender, address(this), repayAmount);
        
        emit Repay(msg.sender, token, repayAmount);
    }
    
    function getAccountHealth(address user) public view returns (uint256 healthFactor) {
        uint256 totalCollateral = 0;
        uint256 totalBorrowed = 0;
        
        // Calculate across all markets
        // Simplified: assume single market for example
        
        return healthFactor;
    }
    
    function _isHealthy(address user, address token, uint256 newBorrow) internal view returns (bool) {
        // Check if user has enough collateral
        return true; // Simplified
    }
    
    function _accrueInterest(UserAccount storage account, Market storage market) internal {
        uint256 timeElapsed = block.timestamp - account.lastUpdate;
        if (timeElapsed > 0) {
            // Apply interest
            account.borrowed += (account.borrowed * market.borrowRate * timeElapsed) / (365 days * 10000);
            account.supplied += (account.supplied * market.supplyRate * timeElapsed) / (365 days * 10000);
            account.lastUpdate = block.timestamp;
        }
    }
}
```

### Interest Rate Models

Variable interest rate based on utilization:

```solidity
contract InterestRateModel {
    // Base rate: 2% per year
    uint256 public constant BASE_RATE = 200; // 2% * 100
    
    // Multiplier: 10% per year at 100% utilization
    uint256 public constant MULTIPLIER = 1000; // 10% * 100
    
    function getBorrowRate(uint256 cash, uint256 borrows) public pure returns (uint256) {
        uint256 utilization = _getUtilization(cash, borrows);
        return BASE_RATE + (utilization * MULTIPLIER) / 1e18;
    }
    
    function getSupplyRate(uint256 cash, uint256 borrows, uint256 reserveFactor) 
        public pure returns (uint256) 
    {
        uint256 borrowRate = getBorrowRate(cash, borrows);
        uint256 utilization = _getUtilization(cash, borrows);
        return (borrowRate * utilization * (10000 - reserveFactor)) / 1e18 / 10000;
    }
    
    function _getUtilization(uint256 cash, uint256 borrows) internal pure returns (uint256) {
        if (borrows == 0) return 0;
        return (borrows * 1e18) / (cash + borrows);
    }
}
```

### Liquidation Process

Liquidate under-collateralized positions:

```javascript title="scripts/liquidate.js"
const hre = require("hardhat");

async function liquidate(borrower, collateralToken, debtToken, repayAmount) {
    const [liquidator] = await hre.ethers.getSigners();
    
    const lendingPool = await hre.ethers.getContractAt("ILendingPool", "POOL_ADDRESS");
    const debtContract = await hre.ethers.getContractAt("IERC20", debtToken);
    
    // Approve debt token for repayment
    await debtContract.approve(lendingPool.address, repayAmount);
    
    // Execute liquidation
    const tx = await lendingPool.liquidationCall(
        borrower,
        debtToken,
        collateralToken,
        repayAmount,
        false // receive underlying, not cTokens
    );
    
    const receipt = await tx.wait();
    console.log(`Liquidation complete! TX: ${receipt.hash}`);
    
    // Calculate profit
    const collateralReceived = await lendingPool.getCollateralBalance(borrower, collateralToken);
    console.log(`Collateral seized: ${hre.ethers.formatEther(collateralReceived)}`);
}

// Monitor for liquidatable positions
async function scanForLiquidations() {
    const lendingPool = await hre.ethers.getContractAt("ILendingPool", "POOL_ADDRESS");
    
    // Get all borrowers
    const borrowers = await lendingPool.getAllBorrowers();
    
    for (const borrower of borrowers) {
        const health = await lendingPool.getAccountHealth(borrower);
        if (health < 1e18) { // Health factor < 1
            console.log(`Liquidatable: ${borrower}, Health: ${health / 1e18}`);
            // Execute liquidation
        }
    }
}
```

---

## Yield Farming

### MasterChef-Style Contract

Yield farming with reward distribution:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract YieldFarm is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;
    
    struct Pool {
        IERC20 lpToken;
        uint256 allocPoint;
        uint256 lastRewardBlock;
        uint256 accRewardPerShare;
        uint256 totalStaked;
    }
    
    struct UserInfo {
        uint256 amount;
        uint256 rewardDebt;
    }
    
    IERC20 public rewardToken;
    uint256 public rewardPerBlock;
    uint256 public totalAllocPoint;
    uint256 public startBlock;
    uint256 public bonusEndBlock;
    
    Pool[] public pools;
    mapping(uint256 => mapping(address => UserInfo)) public userInfo;
    
    event Deposit(address indexed user, uint256 indexed pid, uint256 amount);
    event Withdraw(address indexed user, uint256 indexed pid, uint256 amount);
    event EmergencyWithdraw(address indexed user, uint256 indexed pid, uint256 amount);
    event Harvest(address indexed user, uint256 indexed pid, uint256 amount);
    
    constructor(
        IERC20 _rewardToken,
        uint256 _rewardPerBlock,
        uint256 _startBlock,
        uint256 _bonusEndBlock
    ) Ownable(msg.sender) {
        rewardToken = _rewardToken;
        rewardPerBlock = _rewardPerBlock;
        startBlock = _startBlock;
        bonusEndBlock = _bonusEndBlock;
    }
    
    function addPool(IERC20 _lpToken, uint256 _allocPoint) external onlyOwner {
        _massUpdatePools();
        
        uint256 lastRewardBlock = block.number > startBlock ? block.number : startBlock;
        totalAllocPoint += _allocPoint;
        
        pools.push(Pool({
            lpToken: _lpToken,
            allocPoint: _allocPoint,
            lastRewardBlock: lastRewardBlock,
            accRewardPerShare: 0,
            totalStaked: 0
        }));
    }
    
    function deposit(uint256 _pid, uint256 _amount) external nonReentrant {
        Pool storage pool = pools[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        
        _updatePool(_pid);
        
        if (user.amount > 0) {
            uint256 pending = (user.amount * pool.accRewardPerShare) / 1e12 - user.rewardDebt;
            if (pending > 0) {
                rewardToken.safeTransfer(msg.sender, pending);
                emit Harvest(msg.sender, _pid, pending);
            }
        }
        
        if (_amount > 0) {
            pool.lpToken.safeTransferFrom(msg.sender, address(this), _amount);
            user.amount += _amount;
            pool.totalStaked += _amount;
        }
        
        user.rewardDebt = (user.amount * pool.accRewardPerShare) / 1e12;
        emit Deposit(msg.sender, _pid, _amount);
    }
    
    function withdraw(uint256 _pid, uint256 _amount) external nonReentrant {
        Pool storage pool = pools[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        require(user.amount >= _amount, "Insufficient balance");
        
        _updatePool(_pid);
        
        uint256 pending = (user.amount * pool.accRewardPerShare) / 1e12 - user.rewardDebt;
        if (pending > 0) {
            rewardToken.safeTransfer(msg.sender, pending);
            emit Harvest(msg.sender, _pid, pending);
        }
        
        if (_amount > 0) {
            user.amount -= _amount;
            pool.totalStaked -= _amount;
            pool.lpToken.safeTransfer(msg.sender, _amount);
        }
        
        user.rewardDebt = (user.amount * pool.accRewardPerShare) / 1e12;
        emit Withdraw(msg.sender, _pid, _amount);
    }
    
    function _updatePool(uint256 _pid) internal {
        Pool storage pool = pools[_pid];
        if (block.number <= pool.lastRewardBlock) return;
        
        if (pool.totalStaked == 0) {
            pool.lastRewardBlock = block.number;
            return;
        }
        
        uint256 multiplier = _getMultiplier(pool.lastRewardBlock, block.number);
        uint256 reward = (multiplier * rewardPerBlock * pool.allocPoint) / totalAllocPoint;
        pool.accRewardPerShare += (reward * 1e12) / pool.totalStaked;
        pool.lastRewardBlock = block.number;
    }
    
    function _getMultiplier(uint256 _from, uint256 _to) internal view returns (uint256) {
        if (_to <= bonusEndBlock) return _to - _from;
        if (_from >= bonusEndBlock) return _to - _from;
        return bonusEndBlock - _from;
    }
    
    function _massUpdatePools() internal {
        for (uint256 i = 0; i < pools.length; i++) {
            _updatePool(i);
        }
    }
    
    function pendingReward(uint256 _pid, address _user) external view returns (uint256) {
        Pool storage pool = pools[_pid];
        UserInfo storage user = userInfo[_pid][_user];
        
        uint256 accRewardPerShare = pool.accRewardPerShare;
        if (block.number > pool.lastRewardBlock && pool.totalStaked != 0) {
            uint256 multiplier = _getMultiplier(pool.lastRewardBlock, block.number);
            uint256 reward = (multiplier * rewardPerBlock * pool.allocPoint) / totalAllocPoint;
            accRewardPerShare += (reward * 1e12) / pool.totalStaked;
        }
        
        return (user.amount * accRewardPerShare) / 1e12 - user.rewardDebt;
    }
}
```

### Farming Strategies

| Strategy | Description | Risk | Expected APY |
|----------|-------------|------|--------------|
| **Single Asset** | Stake one token, earn rewards | Low | 10-30% |
| **LP Farming** | Stake LP tokens, earn rewards | Medium | 20-100% |
| **Leveraged Farming** | Borrow to increase position | High | 50-300% |
| **Cross-Protocol** | Stack yields across protocols | High | Variable |

---

## Development Patterns

### Flash Loans

See the [Flash Loan Documentation](../defi/flash-loans.md) for detailed implementation.

### Arbitrage Bots

Basic arbitrage between DEXs:

```javascript title="scripts/arbitrage.js"
const hre = require("hardhat");

class ArbitrageBot {
    constructor(dexA, dexB, tokenA, tokenB, minProfit) {
        this.dexA = dexA;
        this.dexB = dexB;
        this.tokenA = tokenA;
        this.tokenB = tokenB;
        this.minProfit = minProfit;
    }
    
    async checkArbitrage(amount) {
        // Get prices from both DEXs
        const priceA = await this.dexA.getAmountsOut(amount, [this.tokenA, this.tokenB]);
        const priceB = await this.dexB.getAmountsOut(priceA[1], [this.tokenB, this.tokenA]);
        
        const profit = priceB[1] - amount;
        const profitPercent = (profit * 100) / amount;
        
        return {
            profitable: profit > this.minProfit,
            profit,
            profitPercent,
            path: [this.dexA, this.dexB]
        };
    }
    
    async executeArbitrage(amount, path) {
        // Execute flash loan arbitrage
        const flashLoan = await hre.ethers.getContractAt("IFlashLoan", "FLASH_LOAN_ADDRESS");
        
        const tx = await flashLoan.flashLoan(
            this.tokenA,
            amount,
            this.encodeArbitrageData(path)
        );
        
        return await tx.wait();
    }
    
    encodeArbitrageData(path) {
        return hre.ethers.AbiCoder.defaultAbiCoder().encode(
            ['address[]', 'address[]'],
            [path, [this.tokenA, this.tokenB]]
        );
    }
}

// Monitor and execute
async function runArbitrage() {
    const bot = new ArbitrageBot(dexA, dexB, tokenA, tokenB, 1000); // 1000 wei min profit
    
    setInterval(async () => {
        const opportunity = await bot.checkArbitrage(hre.ethers.parseEther("1"));
        if (opportunity.profitable) {
            console.log(`Arbitrage found! Profit: ${opportunity.profitPercent}%`);
            await bot.executeArbitrage(hre.ethers.parseEther("1"), opportunity.path);
        }
    }, 5000); // Check every 5 seconds
}
```

### Yield Aggregators

Auto-compound yield across protocols:

```solidity
contract YieldAggregator is ReentrancyGuard, Ownable {
    struct Strategy {
        address protocol;
        uint256 apy; // Annual percentage yield * 100
        uint256 risk; // 1-10
        uint256 tvl; // Total value locked
    }
    
    Strategy[] public strategies;
    mapping(address => uint256) public userDeposits;
    uint256 public totalDeposits;
    
    function addStrategy(address protocol, uint256 apy, uint256 risk) external onlyOwner {
        strategies.push(Strategy(protocol, apy, risk, 0));
    }
    
    function deposit(uint256 amount) external nonReentrant {
        // Find best strategy based on risk-adjusted return
        uint256 bestStrategy = _findBestStrategy();
        
        // Deposit to protocol
        Strategy storage strategy = strategies[bestStrategy];
        IProtocol(strategy.protocol).deposit(amount);
        strategy.tvl += amount;
        
        userDeposits[msg.sender] += amount;
        totalDeposits += amount;
    }
    
    function _findBestStrategy() internal view returns (uint256) {
        uint256 bestIndex = 0;
        uint256 bestScore = 0;
        
        for (uint256 i = 0; i < strategies.length; i++) {
            // Risk-adjusted return: APY / risk
            uint256 score = strategies[i].apy / strategies[i].risk;
            if (score > bestScore) {
                bestScore = score;
                bestIndex = i;
            }
        }
        
        return bestIndex;
    }
    
    function harvest() external {
        // Collect rewards from all strategies
        for (uint256 i = 0; i < strategies.length; i++) {
            IProtocol(strategies[i].protocol).claimRewards();
        }
        
        // Reinvest rewards
        // ...
    }
    
    function rebalance() external onlyOwner {
        // Move funds to better strategies
        // ...
    }
}
```

### Insurance Protocols

Smart contract insurance:

```solidity
contract DeFiInsurance {
    struct Policy {
        address insured;
        address protocol;
        uint256 coverageAmount;
        uint256 premium;
        uint256 expiration;
        bool active;
    }
    
    struct Claim {
        uint256 policyId;
        uint256 amount;
        string evidence;
        bool approved;
        bool paid;
    }
    
    Policy[] public policies;
    Claim[] public claims;
    
    mapping(address => uint256) public stakedCapital;
    uint256 public totalStaked;
    
    function purchasePolicy(address protocol, uint256 coverage, uint256 duration) external payable {
        uint256 premium = calculatePremium(protocol, coverage);
        require(msg.value >= premium, "Insufficient premium");
        
        policies.push(Policy({
            insured: msg.sender,
            protocol: protocol,
            coverageAmount: coverage,
            premium: premium,
            expiration: block.timestamp + duration,
            active: true
        }));
    }
    
    function fileClaim(uint256 policyId, uint256 amount, string memory evidence) external {
        Policy storage policy = policies[policyId];
        require(policy.insured == msg.sender, "Not policy owner");
        require(policy.active, "Policy not active");
        require(block.timestamp <= policy.expiration, "Policy expired");
        
        uint256 payout = amount > policy.coverageAmount ? policy.coverageAmount : amount;
        require(verifyLoss(evidence), "Invalid evidence");
        
        payable(msg.sender).transfer(payout);
        policy.active = false;
        totalStaked -= policy.coverageAmount;
    }
    
    function calculatePremium(address protocol, uint256 coverage) public pure returns (uint256) {
        // Risk-based pricing
        uint256 riskScore = getRiskScore(protocol);
        return (coverage * riskScore * 30 days) / (365 days * 10000);
    }
    
    function getRiskScore(address protocol) public pure returns (uint256) {
        // Based on audit status, TVL, age, etc.
        return 500; // 5% base rate
    }
    
    function verifyLoss(string memory evidence) internal pure returns (bool) {
        // Verify transaction failure evidence
        return true; // Simplified
    }
}
```

---

## Security Best Practices

### Audit Checklist

Before deploying DeFi protocols:

- [ ] ReentrancyGuard on all external functions
- [ ] Integer overflow checks (Solidity 0.8+)
- [ ] Access control (Ownable/AccessControl)
- [ ] Emergency pause mechanism
- [ ] Oracle manipulation resistance (TWAP, multi-oracle)
- [ ] Flash loan attack prevention
- [ ] Economic modeling (inflation, deflation)
- [ ] Formal verification (if possible)
- [ ] Bug bounty program
- [ ] Insurance coverage

### Common Vulnerabilities

| Vulnerability | Impact | Prevention |
|-------------|--------|------------|
| **Reentrancy** | Drain funds | ReentrancyGuard, checks-effects-interactions |
| **Oracle Manipulation** | Wrong prices | TWAP, multi-oracle, deviation checks |
| **Flash Loan Attacks** | Price manipulation | Time delays, multi-block validation |
| **Integer Overflow** | Unexpected behavior | Solidity 0.8+, SafeMath |
| **Front-Running** | MEV extraction | Commit-reveal, batch auctions |
| **Governance Attacks** | Protocol takeover | Timelocks, quorum requirements |

### Testing Frameworks

```javascript title="test/defi-test.js"
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DeFi Protocol", function () {
    let token, pool, owner, user1, user2;
    
    beforeEach(async () => {
        [owner, user1, user2] = await ethers.getSigners();
        
        const Token = await ethers.getContractFactory("MockToken");
        token = await Token.deploy("Test", "TST");
        
        const Pool = await ethers.getContractFactory("LendingPool");
        pool = await Pool.deploy(token.address);
        
        await token.mint(user1.address, ethers.parseEther("1000"));
        await token.mint(user2.address, ethers.parseEther("1000"));
    });
    
    it("Should allow deposits", async () => {
        await token.connect(user1).approve(pool.address, ethers.parseEther("100"));
        await pool.connect(user1).deposit(ethers.parseEther("100"));
        
        expect(await pool.balanceOf(user1.address)).to.equal(ethers.parseEther("100"));
    });
    
    it("Should calculate interest correctly", async () => {
        // Deposit and wait
        await token.connect(user1).approve(pool.address, ethers.parseEther("100"));
        await pool.connect(user1).deposit(ethers.parseEther("100"));
        
        // Fast forward time
        await network.provider.send("evm_increaseTime", [365 * 24 * 60 * 60]);
        await network.provider.send("evm_mine");
        
        // Check accrued interest
        const balance = await pool.balanceOf(user1.address);
        expect(balance).to.be.gt(ethers.parseEther("100"));
    });
    
    it("Should prevent reentrancy", async () => {
        const Attacker = await ethers.getContractFactory("ReentrancyAttacker");
        const attacker = await Attacker.deploy(pool.address);
        
        await expect(
            attacker.attack()
        ).to.be.revertedWith("ReentrancyGuard: reentrant call");
    });
});
```

---

## Regulatory Considerations

### Compliance Checklist

| Jurisdiction | Requirement | Implementation |
|--------------|-------------|----------------|
| **USA** | SEC registration | Avoid securities classification |
| **EU** | MiCA compliance | Whitepaper, audit, registration |
| **Singapore** | MAS license | Payment services license |
| **Japan** | FSA registration | Exchange license |

### KYC/AML Integration

```solidity
contract KYCDeFi is DeFiProtocol {
    mapping(address => bool) public kycVerified;
    mapping(address => uint256) public dailyLimit;
    
    modifier onlyKYC() {
        require(kycVerified[msg.sender], "KYC required");
        _;
    }
    
    function deposit(uint256 amount) external onlyKYC {
        require(amount <= dailyLimit[msg.sender], "Daily limit exceeded");
        super.deposit(amount);
    }
    
    function verifyKYC(address user) external onlyOwner {
        kycVerified[user] = true;
    }
}
```

---

## Example Projects

### Complete DEX

Features:
- AMM with constant product formula
- Liquidity provision with LP tokens
- Token swaps with slippage protection
- Price oracle with TWAP
- Fee distribution to LPs

### Lending Protocol

Features:
- Multi-asset collateral
- Variable interest rates
- Liquidation engine
- Flash loans
- Governance token

### Yield Aggregator

Features:
- Strategy optimization
- Auto-compounding
- Risk management
- Gas optimization
- Cross-protocol integration

---

## Testing Procedures

1. **Unit Tests**: Each function in isolation
2. **Integration Tests**: Protocol interactions
3. **Fuzzing**: Random input testing
4. **Invariant Tests**: Property-based testing
5. **Fork Tests**: Mainnet simulation
6. **Gas Optimization**: Benchmark all functions
7. **Economic Modeling**: Stress test parameters

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| "Insufficient liquidity" | Low pool depth | Add more liquidity or reduce trade size |
| "Price impact too high" | Large trade vs pool size | Split trade or find deeper pool |
| "Liquidation failed" | Health factor > 1 | Wait for price movement |
| "Reward calculation wrong" | Missing update | Call updatePool before checking |
| "Flash loan failed" | Insufficient repayment | Check fee calculation |
| "Oracle stale" | No recent updates | Implement heartbeat check |

---

## Next Steps

- [Oracle Integration →](../oracle/oracle.md) — Price feeds and VRF
- [Flash Loans →](../defi/flash-loans.md) — Advanced DeFi strategies
- [Token Standards →](../smartcontract/tokens/index.md) — XRC20/XRC721
- [Security Best Practices →](../security/security-practices.md) — Audit checklist
- [IPFS Integration →](../storage/ipfs.md) — Store metadata and assets
