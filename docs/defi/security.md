---
title: DeFi Security — Audit Checklist, Vulnerabilities, and Testing on XDC
description: DeFi security guide for XDC — audit checklist, common vulnerabilities, testing frameworks, and regulatory considerations.
---

# DeFi Security

## Audit Checklist

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

## Common Vulnerabilities

| Vulnerability | Impact | Prevention |
|-------------|--------|------------|
| **Reentrancy** | Drain funds | ReentrancyGuard, checks-effects-interactions |
| **Oracle Manipulation** | Wrong prices | TWAP, multi-oracle, deviation checks |
| **Flash Loan Attacks** | Price manipulation | Time delays, multi-block validation |
| **Integer Overflow** | Unexpected behavior | Solidity 0.8+, SafeMath |
| **Front-Running** | MEV extraction | Commit-reveal, batch auctions |
| **Governance Attacks** | Protocol takeover | Timelocks, quorum requirements |

## Testing Frameworks

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
        await token.connect(user1).approve(pool.address, ethers.parseEther("100"));
        await pool.connect(user1).deposit(ethers.parseEther("100"));
        
        await network.provider.send("evm_increaseTime", [365 * 24 * 60 * 60]);
        await network.provider.send("evm_mine");
        
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

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| "Reentrancy detected" | Missing guard | Add ReentrancyGuard |
| "Price manipulation" | Oracle exploit | Use TWAP, multi-oracle |
| "Governance attack" | Low quorum | Increase timelocks |
| "Economic exploit" | Flawed incentives | Redesign tokenomics |
| "Regulatory issues" | Non-compliance | Add KYC, legal review |

## Next Steps

- [Flash Loans →](./flash-loans.md) — Advanced DeFi strategies
- [Oracle Integration →](../oracle/index.md) — Price feeds and VRF
- [Security Best Practices →](../security/security-practices.md) — General security
