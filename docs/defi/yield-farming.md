---
title: Yield Farming — MasterChef, Strategies, and Aggregation on XDC
description: Yield farming guide for XDC — MasterChef contracts, farming strategies, and yield aggregation.
---

# Yield Farming

## MasterChef-Style Contract

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

## Farming Strategies

| Strategy | Description | Risk | Expected APY |
|----------|-------------|------|--------------|
| **Single Asset** | Stake one token, earn rewards | Low | 10-30% |
| **LP Farming** | Stake LP tokens, earn rewards | Medium | 20-100% |
| **Leveraged Farming** | Borrow to increase position | High | 50-300% |
| **Cross-Protocol** | Stack yields across protocols | High | Variable |

## Yield Aggregators

Auto-compound yield across protocols:

```solidity
contract YieldAggregator is ReentrancyGuard, Ownable {
    struct Strategy {
        address protocol;
        uint256 apy;
        uint256 risk;
        uint256 tvl;
    }
    
    Strategy[] public strategies;
    mapping(address => uint256) public userDeposits;
    uint256 public totalDeposits;
    
    function addStrategy(address protocol, uint256 apy, uint256 risk) external onlyOwner {
        strategies.push(Strategy(protocol, apy, risk, 0));
    }
    
    function deposit(uint256 amount) external nonReentrant {
        uint256 bestStrategy = _findBestStrategy();
        
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
            uint256 score = strategies[i].apy / strategies[i].risk;
            if (score > bestScore) {
                bestScore = score;
                bestIndex = i;
            }
        }
        
        return bestIndex;
    }
    
    function harvest() external {
        for (uint256 i = 0; i < strategies.length; i++) {
            IProtocol(strategies[i].protocol).claimRewards();
        }
    }
    
    function rebalance() external onlyOwner {
        // Move funds to better strategies
    }
}
```

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| "Reward calculation wrong" | Missing update | Call updatePool before checking |
| "Cannot withdraw" | Locked funds | Wait for lock period |
| "Low APY" | High competition | Find newer pools |
| "Impermanent loss" | Price divergence | Use stable pairs |
