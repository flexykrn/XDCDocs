---
title: CI/CD Pipelines for Smart Contract Deployment
sidebar_position: 13
description: Automate testing and deployment of XDC Network smart contracts with GitHub Actions — linting, coverage, testnet deployment, verification, and gated mainnet promotion.
---

# CI/CD Pipelines for Smart Contract Deployment

Deploying smart contracts by hand — running `hardhat run` from a laptop with a hot wallet — does not scale and does not survive audits. A CI/CD pipeline makes every deployment reproducible: the same code, compiled the same way, tested the same way, and deployed through the same reviewed process. Because the XDC Network is fully EVM-compatible, standard Ethereum tooling (Hardhat, Foundry, solhint) works in any CI environment, and GitHub Actions provides everything needed to build a full pipeline with no extra infrastructure.

This guide covers a complete GitHub Actions setup for XDC contracts: a test workflow on every push, a manual deploy workflow targeting Apothem Testnet (chain ID 51), a Foundry variant, and a tag-based mainnet promotion pattern with approval gates.

## Why CI/CD for Contracts

- **Repeatable tests:** Every commit runs the full suite on a clean machine. "Works on my machine" is eliminated as a failure mode.
- **No fat-finger deploys:** Deployments run from versioned, reviewed code with pinned parameters — never from a developer's local checkout with unsaved changes.
- **Audit trail:** Every deployment is tied to a commit hash, a workflow run, and an approving reviewer. Six months later you can answer exactly what code is on-chain and who authorized it.
- **Secrets stay centralized:** Deployer keys live in GitHub Secrets, not on individual laptops that can be lost or compromised.

## Pipeline Stages Overview

A production-grade contract pipeline moves through these stages:

1. **Lint** — `solhint` (and `prettier`/`eslint` for scripts) catches style issues and common security anti-patterns.
2. **Build** — `npx hardhat compile` proves the contracts compile with the pinned Solidity version.
3. **Test** — the full Hardhat or Foundry suite runs against a local in-memory chain.
4. **Coverage** — `npx hardhat coverage` or `forge coverage` reports line/branch coverage; optionally fail below a threshold.
5. **Deploy to testnet** — a manual or merge-triggered job deploys to Apothem (chain ID 51, RPC `https://rpc.apothem.network`).
6. **Verify** — the deployment job verifies source on the testnet explorer immediately after deploying.
7. **Manual gate** — a GitHub Environment protection rule requires human approval before anything touches mainnet.
8. **Mainnet deploy** — an approved, tag-triggered job deploys to XDC mainnet (chain ID 50) and verifies on XDCScan.

## GitHub Actions: Test Workflow

This workflow runs on every push and pull request. Save it as `.github/workflows/test.yml`:

```yaml
name: Test

on:
  push:
    branches: [main]
  pull_request:

jobs:
  lint-build-test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Lint contracts
        run: npx solhint 'contracts/**/*.sol'

      - name: Compile contracts
        run: npx hardhat compile

      - name: Run tests
        run: npx hardhat test

      - name: Coverage report
        run: npx hardhat coverage
```

`npm ci` installs exactly what `package-lock.json` pins, keeping CI builds reproducible. The `cache: npm` option on `setup-node` caches `node_modules` between runs.

## GitHub Actions: Deploy to Apothem

Testnet deployment uses a manual `workflow_dispatch` trigger so it only runs when a developer explicitly requests it. Save as `.github/workflows/deploy-apothem.yml`:

```yaml
name: Deploy to Apothem

on:
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: apothem
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Run tests before deploy
        run: npx hardhat test

      - name: Deploy to Apothem
        env:
          PRIVATE_KEY: ${{ secrets.APOTHEM_DEPLOYER_PRIVATE_KEY }}
        run: npx hardhat run scripts/deploy.js --network apothem

      - name: Verify on explorer
        env:
          PRIVATE_KEY: ${{ secrets.APOTHEM_DEPLOYER_PRIVATE_KEY }}
        run: npx hardhat run scripts/verify.js --network apothem
```

**Never hardcode private keys.** The deployer key is stored as a GitHub Secret (`Settings → Secrets and variables → Actions`) and injected via `process.env`. The matching `hardhat.config.js` network block:

```javascript
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: "0.8.24",
  networks: {
    apothem: {
      url: "https://rpc.apothem.network",
      chainId: 51,
      accounts: [process.env.PRIVATE_KEY],
    },
    xdc: {
      url: "https://rpc.xinfin.network",
      chainId: 50,
      accounts: [process.env.PRIVATE_KEY],
    },
  },
};
```

The deploy script should print the deployed contract address so the verify step (or a follow-up manual `npx hardhat verify --network apothem <address>`) can reference it — see [Deployment & Verification](/docs/smart-contracts/deployment-verification) for the verification flow.

## Security Rules for CI

- **Secrets management:** Store keys only in GitHub Secrets (or an external vault). Never commit `.env` files — add `.env` to `.gitignore` and verify with `git check-ignore .env`.
- **Never log private keys:** GitHub masks known secrets in logs, but only if the exact value appears. Never `echo` or `console.log` key material, mnemonics, or signed raw transactions.
- **Dedicated deployer wallet:** Use a wallet that exists only for deployments, funded with just enough XDC for gas — XDC fees are near-zero, so a few test XDC on Apothem and a small balance on mainnet suffice. It should never custody protocol funds.
- **Branch protection:** Require pull requests and passing CI status checks before merging to `main`. The test workflow above is your required check.
- **Required reviews:** Require at least one approving review on PRs that touch `contracts/` or deployment scripts.
- **Environment protection rules:** Configure GitHub Environments (`Settings → Environments`) — an `apothem` environment with no restrictions, and a `mainnet` environment with required reviewers so the mainnet job pauses until a human approves.

## Optional: Foundry Variant

Foundry projects can run `forge test` in CI with the official toolchain action:

```yaml
name: Foundry Test

on: [push, pull_request]

jobs:
  forge-test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          submodules: recursive

      - name: Install Foundry
        uses: foundry-rs/foundry-toolchain@v1
        with:
          version: nightly

      - name: Run forge tests
        run: forge test -vvv

      - name: Coverage
        run: forge coverage
```

**Caching tips:** for Hardhat, `actions/setup-node` with `cache: npm` handles `node_modules`. For Foundry, `foundry-toolchain` caches the toolchain; add `actions/cache` on `~/.foundry` and the `out/` directory if builds are slow.

## Mainnet Promotion Pattern

Promote to mainnet with a **tag-based release**: deploy only from an annotated version tag (e.g., `v1.0.0`), behind a GitHub Environment approval gate. A maintainer reviews the Apothem rehearsal, creates and pushes a signed tag, then approves the pending environment deployment:

```yaml
name: Deploy to Mainnet

on:
  push:
    tags: ["v*"]

jobs:
  deploy-mainnet:
    runs-on: ubuntu-latest
    environment:
      name: mainnet
      url: https://xdcscan.com
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx hardhat test
      - name: Deploy to XDC mainnet
        env:
          PRIVATE_KEY: ${{ secrets.MAINNET_DEPLOYER_PRIVATE_KEY }}
        run: npx hardhat run scripts/deploy.js --network xdc
```

The `mainnet` environment's required-reviewers rule makes the job block until a designated reviewer clicks approve in the Actions UI — this is the human gate between a passing pipeline and an irreversible mainnet deployment.

## See Also

- [Smart Contract Testing Guide](/docs/smart-contracts/testing-guide) — the test suites these pipelines run.
- [Deployment & Verification](/docs/smart-contracts/deployment-verification) — manual deployment flows and XDCScan verification.
- [Smart Contract Security Best Practices](/docs/smart-contracts/security-best-practices) — audit checklist and key management guidance.
