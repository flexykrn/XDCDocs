---
title: Enterprise Integration Patterns
description: Architecture patterns for integrating XDC Network with enterprise systems. API integration, event streaming, legacy connectivity, and cloud deployment options.
---

# Enterprise Integration Patterns

This guide covers proven architecture patterns for integrating XDC Network with existing enterprise infrastructure, including core banking systems, ERP platforms, and cloud services.

---

## Pattern 1: API Gateway Integration

### Overview
Expose XDC blockchain functionality through REST APIs that enterprise applications already understand.

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Banking   │────▶│   API       │────▶│   XDC       │────▶│   XDC       │
│   Core      │     │   Gateway   │     │   Node      │     │   Network   │
│   System    │◀────│  (REST)     │◀────│  (RPC)      │◀────│             │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

### Implementation

**Node.js API Gateway:**

```javascript
const express = require('express');
const { ethers } = require('ethers');

const app = express();
app.use(express.json());

const provider = new ethers.JsonRpcProvider('https://rpc.xinfin.network');

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', network: 'xdc-mainnet' });
});

// Get balance
app.get('/api/v1/balance/:address', async (req, res) => {
    try {
        const balance = await provider.getBalance(req.params.address);
        res.json({
            address: req.params.address,
            balance: ethers.formatEther(balance),
            currency: 'XDC'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Submit transaction
app.post('/api/v1/transaction', async (req, res) => {
    const { to, value, data } = req.body;
    
    try {
        const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
        const tx = await wallet.sendTransaction({
            to,
            value: ethers.parseEther(value),
            data: data || '0x'
        });
        
        res.json({
            txHash: tx.hash,
            status: 'pending',
            explorer: `https://xdcscan.com/tx/${tx.hash}`
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(3000, () => console.log('XDC API Gateway running on port 3000'));
```

### When to Use
- Banking core systems
- Mobile banking apps
- Internal dashboards
- Third-party integrations

---

## Pattern 2: Event Streaming

### Overview
Use event-driven architecture to react to blockchain events in real-time.

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   XDC       │────▶│   Event     │────▶│   Message   │────▶│   ERP/CRM   │
│   Network   │     │   Listener  │     │   Queue     │     │   Systems   │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

### Implementation

**Event Listener with Kafka:**

```javascript
const { ethers } = require('ethers');
const { Kafka } = require('kafkajs');

const kafka = new Kafka({ clientId: 'xdc-events', brokers: ['kafka:9092'] });
const producer = kafka.producer();

const provider = new ethers.WebSocketProvider('wss://ws.xinfin.network');

// Listen for Transfer events
const filter = {
    address: '0xTokenContractAddress',
    topics: [ethers.id('Transfer(address,address,uint256)')]
};

provider.on(filter, async (log) => {
    const event = {
        txHash: log.transactionHash,
        blockNumber: log.blockNumber,
        from: ethers.getAddress('0x' + log.topics[1].slice(26)),
        to: ethers.getAddress('0x' + log.topics[2].slice(26)),
        amount: ethers.toBigInt(log.data).toString(),
        timestamp: Date.now()
    };
    
    await producer.send({
        topic: 'xdc-transfers',
        messages: [{ value: JSON.stringify(event) }]
    });
    
    console.log('Event published:', event.txHash);
});
```

### When to Use
- Real-time notifications
- Audit logging
- Compliance monitoring
- Analytics pipelines

---

## Pattern 3: Legacy System Bridge

### Overview
Connect mainframe/legacy systems to XDC without changing existing infrastructure.

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Mainframe │────▶│   Message   │────▶│   XDC       │────▶│   XDC       │
│   (COBOL)   │◀────│   Bridge    │◀────│   Adapter   │◀────│   Network   │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

### Implementation

**Message Bridge:**

```javascript
const { Queue } = require('bull');
const { ethers } = require('ethers');

// Connect to legacy message queue
const legacyQueue = new Queue('legacy-messages', 'redis://redis:6379');

const provider = new ethers.JsonRpcProvider('https://rpc.xinfin.network');
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// Process messages from legacy system
legacyQueue.process(async (job) => {
    const { type, payload } = job.data;
    
    switch (type) {
        case 'PAYMENT':
            const tx = await wallet.sendTransaction({
                to: payload.destination,
                value: ethers.parseEther(payload.amount)
            });
            return { status: 'sent', txHash: tx.hash };
            
        case 'SMART_CONTRACT_CALL':
            const contract = new ethers.Contract(
                payload.contractAddress,
                payload.abi,
                wallet
            );
            const result = await contract[payload.method](...payload.args);
            return { status: 'executed', result };
            
        default:
            throw new Error(`Unknown message type: ${type}`);
    }
});
```

### When to Use
- Mainframe integration
- COBOL systems
- Proprietary protocols
- Gradual migration

---

## Pattern 4: Cloud-Native Deployment

### Overview
Deploy XDC infrastructure on cloud platforms with managed services.

### AWS Deployment

```yaml
# docker-compose.aws.yml
version: '3.8'

services:
  xdc-node:
    image: xinfinorg/xinfin-node:latest
    ports:
      - "30303:30303"
      - "8545:8545"
    volumes:
      - xdc-data:/xdcchain
    environment:
      - NETWORK=mainnet
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '4'
          memory: 16G
    
  api-gateway:
    image: xdc-api-gateway:latest
    ports:
      - "3000:3000"
    environment:
      - RPC_URL=http://xdc-node:8545
      - AWS_REGION=us-east-1
    depends_on:
      - xdc-node

  monitoring:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml

volumes:
  xdc-data:
```

### Terraform Infrastructure

```hcl
# main.tf
provider "aws" {
  region = "us-east-1"
}

module "xdc_cluster" {
  source = "terraform-aws-modules/ecs/aws"
  
  cluster_name = "xdc-enterprise"
  
  services = {
    xdc-node = {
      cpu    = 4096
      memory = 16384
      
      container_definitions = jsonencode([
        {
          name  = "xdc-node"
          image = "xinfinorg/xinfin-node:latest"
          portMappings = [
            { containerPort = 30303, protocol = "tcp" },
            { containerPort = 8545, protocol = "tcp" }
          ]
          mountPoints = [
            { sourceVolume = "xdc-data", containerPath = "/xdcchain" }
          ]
        }
      ])
    }
  }
}
```

---

## Pattern 5: Multi-Cloud Hybrid

### Overview
Run validator nodes across multiple cloud providers for resilience.

| Component | AWS | GCP | Azure | On-Prem |
|-----------|-----|-----|-------|---------|
| Validator 1 | ✅ | ❌ | ❌ | ❌ |
| Validator 2 | ❌ | ✅ | ❌ | ❌ |
| Validator 3 | ❌ | ❌ | ✅ | ❌ |
| Standby | ❌ | ❌ | ❌ | ✅ |

### Benefits
- **No single point of failure**
- **Vendor independence**
- **Geographic distribution**
- **Compliance flexibility**

---

## Security Patterns

### Pattern: Air-Gapped Signing

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Online    │────▶│   Signing   │────▶│   Offline   │
│   Node      │     │   Service   │     │   HSM       │
└─────────────┘     └─────────────┘     └─────────────┘
```

**Implementation:**

```javascript
const { KMS } = require('aws-sdk');
const kms = new KMS();

async function signWithHSM(messageHash) {
    const params = {
        KeyId: process.env.KMS_KEY_ID,
        Message: Buffer.from(messageHash.slice(2), 'hex'),
        SigningAlgorithm: 'ECDSA_SHA_256'
    };
    
    const result = await kms.sign(params).promise();
    return '0x' + result.Signature.toString('hex');
}
```

---

## Performance Benchmarks

| Pattern | Latency | Throughput | Complexity |
|---------|---------|------------|------------|
| API Gateway | ~100ms | 1,000 TPS | Low |
| Event Streaming | ~50ms | 10,000 TPS | Medium |
| Legacy Bridge | ~500ms | 100 TPS | High |
| Cloud-Native | ~50ms | 5,000 TPS | Medium |
| Multi-Cloud | ~100ms | 2,000 TPS | High |

---

## Choosing the Right Pattern

| Enterprise Need | Recommended Pattern | Why |
|-----------------|---------------------|-----|
| Mobile banking | API Gateway | Simple REST APIs |
| Real-time trading | Event Streaming | Low latency |
| Core banking | Legacy Bridge | No changes to mainframe |
| Global deployment | Multi-Cloud | Resilience |
| High security | Air-Gapped Signing | HSM protection |

---

## 🚀 Next Steps

1. **[Private Subnets →](./private-subnets.md)** — Deploy permissioned networks (⏱️ 30 min)
2. **[ISO 20022 →](./iso-20022.md)** — Financial messaging integration (⏱️ 20 min)
3. **[Compliance →](./compliance.md)** — Regulatory requirements (⏱️ 15 min)

Or explore:
- **[API Reference →](../api/json-rpc.md)** — Direct RPC integration
- **[Security Practices →](../security/security-practices.md)** — Secure your integration
- **[Validator Setup →](../xdcchain/developers/node_operators/validator-handbook.md)** — Run your own node
