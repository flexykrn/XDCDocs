---
title: Audit Preparation
description: Pre-deployment checklist and tooling for XDC smart contract audits.
---

# Audit Preparation

## Pre-Audit Checklist

### Code Completeness

- [ ] All contracts compile without warnings
- [ ] Test coverage > 90% (lines + branches)
- [ ] Documentation complete (NatSpec for all functions)
- [ ] No TODO or FIXME comments remaining
- [ ] No commented-out code
- [ ] Consistent code style (Solhint/Prettier)

### Security Preparation

- [ ] Slither scan — 0 critical/high issues
- [ ] Mythril scan — no reachable vulnerabilities
- [ ] Echidna fuzzing — 10000+ tests passed
- [ ] Manual review by internal security team
- [ ] Economic model reviewed

### Documentation

- [ ] Architecture diagram
- [ ] Threat model
- [ ] Access control matrix
- [ ] Upgrade plan (if applicable)
- [ ] Emergency pause procedure

## Audit Scope Document

```markdown
# Audit Scope — [Project Name]

## Overview
[One-paragraph description]

## Contracts
| Contract | Lines | Purpose |
|----------|-------|---------|
| Token.sol | 150 | XRC20 token |
| Staking.sol | 300 | Staking mechanism |

## In Scope
- All functions in listed contracts
- Upgrade mechanism
- Access control

## Out of Scope
- Third-party dependencies (OpenZeppelin)
- Frontend
- Off-chain services

## Key Risks
1. Reentrancy in staking withdrawals
2. Front-running in reward distribution

## Testnet Deployment
- Address: 0x...
- Verified on: https://apothem.xdcscan.io/address/0x...
```

## Tooling

### Slither

```bash
# Install
pip install slither-analyzer

# Run full analysis
slither . --config-file slither.config.json

# Generate report
slither . --json slither-report.json
```

### Mythril

```bash
# Install
pip install mythril

# Analyze single contract
myth analyze contracts/Token.sol --execution-timeout 600

# Parallel analysis
myth analyze . --solc-json mythril.config.json
```

### Echidna

```bash
# Install
docker pull trailofbits/echidna

# Run fuzzing
docker run -v $(pwd):/src trailofbits/echidna echidna-test /src/contracts/Token.sol --contract Token
```

### Certora Prover

```bash
# Install
pip install certora-cli

# Run verification
certoraRun contracts/Token.sol:Token --verify Token:specs/Token.spec
```

## Auditor Selection

| Firm | Specialization | Cost | Timeline |
|------|---------------|------|----------|
| OpenZeppelin | DeFi, upgrades | $$$$ | 4-6 weeks |
| Trail of Bits | Cryptography | $$$$ | 3-4 weeks |
| CertiK | Automated + manual | $$$ | 2-3 weeks |
| Hacken | Web3 security | $$ | 2-3 weeks |
| Consensys Diligence | Ethereum ecosystem | $$$$ | 4-6 weeks |

## Post-Audit Actions

1. **Review findings** — Categorize as fix, accept, or dispute
2. **Fix critical/high** — All must be resolved
3. **Document accepted risks** — For medium/low with justification
4. **Re-audit fixes** — Verify fixes don't introduce new issues
5. **Publish report** — With findings and resolutions
6. **Deploy to mainnet** — Only after all critical/high fixed

## XDC-Specific Considerations

- Test on **Apothem testnet** before audit
- Verify with **XDCScan** explorer
- Check **XDC-specific precompiles** for edge cases
- Ensure **legacy gas** handling is correct
