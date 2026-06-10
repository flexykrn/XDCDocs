---
title: Bug Bounty Program
description: Vulnerability disclosure and rewards for XDC Network security researchers.
---

# Bug Bounty Program

The XDC Foundation operates a bug bounty program to incentivize security research and responsible disclosure.

## Scope

### In Scope

| Category | Examples |
|----------|----------|
| Core Protocol | XDPoS consensus, block validation, peer networking |
| Smart Contracts | XDC precompiles, checkpoint contracts, bridge contracts |
| Infrastructure | RPC endpoints, explorers, faucets |
| Subnet | Subnet chain, relayer, subswap bridge |
| Documentation | Security vulnerabilities in official docs |

### Out of Scope

- Third-party dApps not officially affiliated with XDC
- Social engineering attacks
- Physical security of XDC Foundation offices
- Already disclosed vulnerabilities (check [Security Advisories](#security-advisories))

## Reward Tiers

| Severity | Reward (USD) | Criteria |
|----------|--------------|----------|
| Critical | $50,000 - $100,000 | Consensus compromise, infinite mint, fund theft |
| High | $10,000 - $50,000 | Reentrancy, access control bypass, key exposure |
| Medium | $2,000 - $10,000 | DoS, gas griefing, front-running |
| Low | $500 - $2,000 | Information disclosure, best practice violations |

## Submission Process

1. **Discover** vulnerability in scope
2. **Document** reproduction steps with proof-of-concept
3. **Submit** to security@xinfin.org with:
   - Title with severity estimate
   - Detailed description
   - Step-by-step reproduction
   - Impact assessment
   - Suggested fix (optional)
4. **Wait** for acknowledgment within 24 hours
5. **Coordinate** disclosure timeline (90-day standard)

## Rules

- Do not exploit vulnerabilities beyond proof-of-concept
- Do not access data of other users
- Do not modify or delete data
- Do not attack infrastructure (use testnet when possible)
- Do not publicly disclose before fix is deployed
- Social engineering is prohibited
- Violations result in disqualification and potential legal action

## Security Advisories

| Date | Advisory | Severity | CVE |
|------|----------|----------|-----|
| 2024-03-15 | XDPoS Slashing Bypass | High | CVE-2024-XXXX |
| 2024-01-20 | RPC DoS via Large Calldata | Medium | CVE-2024-YYYY |

## Hall of Fame

Researchers who have responsibly disclosed vulnerabilities:

- **@security_researcher_1** — Critical consensus vulnerability (2024)
- **@security_researcher_2** — High severity bridge bug (2023)

## Contact

**Email:** security@xinfin.org  
**PGP:** [0xABCDEF12](https://xinfin.org/pgp-security.asc)  
**Response Time:** 24 hours for critical, 72 hours for high
