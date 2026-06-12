---
title: DEX Integration — AMM, Liquidity, and Swaps on XDC
description: DEX integration guide for XDC — AMM mechanics, liquidity provision, swap integration, and price oracles.
---

# DEX Integration

## AMM Mechanics

Constant product market maker:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract SimpleAMM {
    uint256 public reserveA;
    uint256 public reserveB;
    uint256 public constantK;
    mapping(address => uint256) public liquidityBalance;
    uint256 public totalLiquidity;
    
    uint256 public constant FEE_NUMERATOR = 3;
    uint256 public constant FEE_DENOMINATOR = 1000;
    
    event Swap(address indexed user, address tokenIn, uint256 amountIn, uint256 amountOut);
    event LiquidityAdded(address indexed provider, uint256 amountA, uint256 amountB, uint256 liquidity);
    
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

## Liquidity Provision

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
    
    await tokenAContract.approve(routerAddress, amountA);
    await tokenBContract.approve(routerAddress, amountB);
    
    const tx = await router.addLiquidity(
        tokenA,
        tokenB,
        amountA,
        amountB,
        0,
        0,
        deployer.address,
        Math.floor(Date.now() / 1000) + 300
    );
    
    const receipt = await tx.wait();
    console.log(`Liquidity added! TX: ${receipt.hash}`);
    
    const pairAddress = await router.getPair(tokenA, tokenB);
    const pair = await hre.ethers.getContractAt("IPair", pairAddress);
    const lpBalance = await pair.balanceOf(deployer.address);
    console.log(`LP tokens received: ${hre.ethers.formatEther(lpBalance)}`);
}

addLiquidity().catch(console.error);
```

## Swap Integration

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
    
    await tokenContract.approve(routerAddress, amountIn);
    
    const amounts = await router.getAmountsOut(amountIn, [tokenIn, tokenOut]);
    const expectedOut = amounts[amounts.length - 1];
    const minOut = (expectedOut * 95n) / 100n;
    
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

## Price Oracle Usage

```solidity
contract DEXPriceOracle {
    address public pair;
    address public token0;
    address public token1;
    
    uint256 public priceCumulativeLast;
    uint32 public blockTimestampLast;
    
    constructor(address _pair) {
        pair = _pair;
        token0 = IPair(_pair).token0();
        token1 = IPair(_pair).token1();
    }
    
    function getPrice() public view returns (uint256 price) {
        (uint112 reserve0, uint112 reserve1, ) = IPair(pair).getReserves();
        price = (uint256(reserve0) * 1e18) / uint256(reserve1);
    }
    
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

## Available Protocols

| Protocol | Type | Status | Website |
|----------|------|--------|---------|
| **Globiance** | DEX | Live | globiance.com |
| **XDC DeFi** | Lending | In Development | - |
| **Prime Numbers** | NFT + DeFi | Live | primenumbers.xyz |
| **StorX** | Storage + DeFi | Live | storx.tech |

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| "Insufficient liquidity" | Low pool depth | Add more liquidity or reduce trade size |
| "Price impact too high" | Large trade vs pool size | Split trade or find deeper pool |
| "Slippage exceeded" | High volatility | Increase slippage tolerance |
| "LP tokens not received" | Approval missing | Approve router for both tokens |
