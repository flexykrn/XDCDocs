---
title: CI/CD Pipelines for Smart Contracts
description: Automated testing, deployment, and verification pipelines for XDC smart contracts using GitHub Actions, GitLab CI, and Jenkins.
---

Difficulty: Intermediate | Time: ~30 minutes | Tools: GitHub Actions, GitLab CI, Jenkins

# CI/CD Pipelines for Smart Contract Deployment

Automated CI/CD pipelines ensure every code change is tested, deployed, and verified consistently. This guide provides production-ready pipeline templates for XDC smart contract development.

## Prerequisites

- [Hardhat Guide](../smartcontract/hardhat.md) or [Foundry Guide](../smartcontract/foundry.md) completed
- [Testing Guide](../smartcontract/testing.md) completed
- Repository hosted on GitHub, GitLab, or accessible by Jenkins

---

## Pipeline Overview

A complete CI/CD pipeline for smart contracts includes:

1. **Lint** — Solidity style checks
2. **Test** — Unit tests with coverage
3. **Build** — Compilation verification
4. **Deploy** — Automated testnet deployment
5. **Verify** — Contract verification on XDCScan
6. **Notify** — Team notifications

---

## GitHub Actions

### Complete Workflow

Create `.github/workflows/contracts.yml`:

```yaml title=".github/workflows/contracts.yml"
name: Smart Contract CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  PRIVATE_KEY: ${{ secrets.PRIVATE_KEY }}
  APOTHEM_RPC: https://rpc.apothem.network
  MAINNET_RPC: https://rpc.xinfin.network

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linter
        run: npx solhint 'contracts/**/*.sol'
      
      - name: Run tests
        run: npx hardhat test
      
      - name: Generate coverage
        run: npx hardhat coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  deploy-testnet:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/develop'
    environment: apothem
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Deploy to Apothem
        run: npx hardhat run scripts/deploy.js --network apothem
      
      - name: Verify contract
        run: npx hardhat verify --network apothem ${{ steps.deploy.outputs.contract_address }}

  deploy-mainnet:
    needs: [test, deploy-testnet]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment: mainnet
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Deploy to Mainnet
        run: npx hardhat run scripts/deploy.js --network xdc
      
      - name: Verify contract
        run: npx hardhat verify --network xdc ${{ steps.deploy.outputs.contract_address }}
```

### Required Secrets

Add these in GitHub → Settings → Secrets and variables → Actions:

| Secret | Description |
|--------|-------------|
| `PRIVATE_KEY` | Deployer wallet private key (with `0x` prefix) |
| `APOTHEM_RPC` | Optional: custom Apothem RPC URL |
| `MAINNET_RPC` | Optional: custom Mainnet RPC URL |

> ⚠️ **Security**  
> Never commit private keys to the repository. Always use GitHub Secrets.

---

## GitLab CI

### Complete Pipeline

Create `.gitlab-ci.yml`:

```yaml title=".gitlab-ci.yml"
stages:
  - test
  - deploy
  - verify

variables:
  NODE_VERSION: "18"
  APOTHEM_RPC: "https://rpc.apothem.network"
  MAINNET_RPC: "https://rpc.xinfin.network"

test:
  stage: test
  image: node:18-alpine
  before_script:
    - npm ci
  script:
    - npx solhint 'contracts/**/*.sol'
    - npx hardhat test
    - npx hardhat coverage
  coverage: '/All files[^|]*\|[^|]*\s+([\d\.]+)/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml
    paths:
      - coverage/
  only:
    - merge_requests
    - main
    - develop

deploy_apothem:
  stage: deploy
  image: node:18-alpine
  environment:
    name: apothem
    url: https://testnet.xdcscan.com
  before_script:
    - npm ci
  script:
    - npx hardhat run scripts/deploy.js --network apothem
  only:
    - develop
  when: manual

deploy_mainnet:
  stage: deploy
  image: node:18-alpine
  environment:
    name: mainnet
    url: https://xdcscan.com
  before_script:
    - npm ci
  script:
    - npx hardhat run scripts/deploy.js --network xdc
  only:
    - main
  when: manual
```

### Required Variables

Add these in GitLab → Settings → CI/CD → Variables:

| Variable | Description | Protected | Masked |
|----------|-------------|-----------|--------|
| `PRIVATE_KEY` | Deployer private key | Yes | Yes |
| `APOTHEM_RPC` | Apothem RPC URL | No | No |
| `MAINNET_RPC` | Mainnet RPC URL | No | No |

---

## Jenkins

### Jenkinsfile

Create `Jenkinsfile`:

```groovy title="Jenkinsfile"
pipeline {
    agent any
    
    environment {
        NODE_VERSION = '18'
        APOTHEM_RPC = 'https://rpc.apothem.network'
        MAINNET_RPC = 'https://rpc.xinfin.network'
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Install') {
            steps {
                sh 'npm ci'
            }
        }
        
        stage('Lint') {
            steps {
                sh 'npx solhint contracts/**/*.sol'
            }
        }
        
        stage('Test') {
            steps {
                sh 'npx hardhat test'
            }
            post {
                always {
                    publishTestResults testResultsPattern: 'test-results.xml'
                }
            }
        }
        
        stage('Coverage') {
            steps {
                sh 'npx hardhat coverage'
            }
            post {
                always {
                    publishHTML([
                        allowMissing: false,
                        alwaysLinkToLastBuild: true,
                        keepAll: true,
                        reportDir: 'coverage',
                        reportFiles: 'index.html',
                        reportName: 'Coverage Report'
                    ])
                }
            }
        }
        
        stage('Deploy Apothem') {
            when {
                branch 'develop'
            }
            steps {
                withCredentials([string(credentialsId: 'private-key', variable: 'PRIVATE_KEY')]) {
                    sh 'npx hardhat run scripts/deploy.js --network apothem'
                }
            }
        }
        
        stage('Deploy Mainnet') {
            when {
                branch 'main'
            }
            steps {
                withCredentials([string(credentialsId: 'private-key', variable: 'PRIVATE_KEY')]) {
                    sh 'npx hardhat run scripts/deploy.js --network xdc'
                }
            }
        }
    }
    
    post {
        failure {
            mail to: 'team@example.com',
                 subject: "Failed Pipeline: ${currentBuild.fullDisplayName}",
                 body: "Check console output at ${env.BUILD_URL}"
        }
    }
}
```

---

## Environment Management

### Branch-Based Deployment

| Branch | Environment | Network | Auto-deploy |
|--------|-------------|---------|-------------|
| `feature/*` | Local | Hardhat Network | No |
| `develop` | Staging | Apothem Testnet | Yes |
| `main` | Production | XDC Mainnet | Manual approval |

### Environment Configuration

Create `environments/` folder:

```
environments/
├── .env.local
├── .env.apothem
└── .env.mainnet
```

```bash title="environments/.env.apothem"
PRIVATE_KEY=0x...
RPC_URL=https://rpc.apothem.network
CHAIN_ID=51
VERIFIER_URL=https://testnet.xdcscan.com/api
```

```bash title="environments/.env.mainnet"
PRIVATE_KEY=0x...
RPC_URL=https://rpc.xinfin.network
CHAIN_ID=50
VERIFIER_URL=https://xdcscan.com/api
```

---

## Secret Management

### GitHub Actions

Use **environments** for secret isolation:

1. Settings → Environments → New environment
2. Name: `apothem` or `mainnet`
3. Add protection rules (required reviewers)
4. Add environment-specific secrets

### GitLab CI

Use **protected variables**:

1. Settings → CI/CD → Variables
2. Add variable
3. Check "Protect variable" (only available on protected branches)
4. Check "Mask variable" (hide in job logs)

### Jenkins

Use **Credentials Plugin**:

1. Manage Jenkins → Manage Credentials
2. Add Credentials → Secret text
3. ID: `private-key`
4. Scope: Global

---

## Rollback Procedures

### Contract Rollback

Contracts are immutable. "Rollback" means:

1. **Deploy new version** with fix
2. **Update proxy** (if using upgradeable contracts)
3. **Notify users** of new contract address

### Pipeline Rollback

```bash
# Revert to previous commit
git revert HEAD

# Redeploy previous version
git checkout <previous-commit>
npx hardhat run scripts/deploy.js --network <network>
```

---

## Security Considerations

1. **Private Key Storage**
   - Never commit to repository
   - Use platform-native secrets (GitHub Secrets, GitLab Variables, Jenkins Credentials)
   - Rotate keys regularly

2. **Access Control**
   - Require approval for mainnet deployments
   - Use branch protection rules
   - Limit who can view secrets

3. **Audit Trail**
   - Log all deployments
   - Tag releases with contract addresses
   - Maintain deployment history

4. **Network Isolation**
   - Separate testnet and mainnet credentials
   - Use different deployer wallets per environment

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `insufficient funds` | Wallet empty | Fund wallet from faucet (testnet) or exchange (mainnet) |
| `Nonce too high` | Out of sync | Reset account nonce in MetaMask or wallet |
| `Verification failed` | API delay | Wait 30 seconds, retry with `--delay 30` |
| `Timeout` | Network slow | Increase timeout in `hardhat.config.js` |
| `Secret not found` | Wrong secret name | Check GitHub/GitLab secret configuration |

---

## Next Steps

- [Testing Guide →](../smartcontract/testing.md) — comprehensive testing patterns
- [Debugging Guide →](../smartcontract/debugging.md) — troubleshoot failed deployments
- [Security Best Practices →](../security/security-practices.md) — audit checklist before mainnet
