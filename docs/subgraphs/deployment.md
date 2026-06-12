## Deployment

### Subgraph Studio

Subgraph Studio is the recommended platform for creating, testing, and publishing subgraphs to The Graph Network.

**Setup:**

1. Visit https://thegraph.com/studio/
2. Connect your wallet (MetaMask or WalletConnect)
3. Create a new subgraph
4. Note your deployment key

**Authenticate CLI:**

```bash
graph auth --studio YOUR_DEPLOY_KEY
```

**Deploy:**

```bash
graph deploy --studio xdc-token-indexer
```

**Version Management:**

- Each deployment creates a new version
- Versions are identified by IPFS hash
- Query URL remains stable across versions
- Previous versions remain accessible

### Hosted Service

The hosted service provides free subgraph indexing with API access.

**Create Subgraph:**

1. Visit https://thegraph.com/hosted-service/
2. Sign in with GitHub
3. Click "Add Subgraph"
4. Enter name and description

**Authenticate:**

```bash
graph auth --product hosted-service YOUR_ACCESS_TOKEN
```

**Deploy:**

```bash
graph deploy --product hosted-service YOUR_GITHUB_USERNAME/xdc-token-indexer
```

**XDC Network Configuration:**

Ensure your `subgraph.yaml` specifies:

```yaml
network: xdc
```

For testnet deployment:

```yaml
network: apothem
```

### Decentralized Network

Publishing to The Graph Network requires GRT tokens and follows a curation model.

**Requirements:**

- GRT tokens for curation signaling
- Subgraph published to Subgraph Studio
- Indexers available for XDC network

**Publish:**

```bash
graph publish --studio xdc-token-indexer
```

**Signal Curation:**

- Deposit GRT to signal quality to indexers
- Higher curation attracts more indexers
- Earn query fee rewards from usage

### XDC-Specific Configuration

**Network Names:**

| Environment | Network Value |
|-------------|--------------|
| Mainnet | `xdc` |
| Testnet | `apothem` |

**RPC Configuration:**

For self-hosted Graph Nodes, configure XDC RPC:

```bash
ethereum="xdc:https://rpc.xinfin.network"
```

For WebSocket support:

```bash
ethereum="xdc:wss://rpc.xinfin.network"
```

**Block Time Considerations:**

XDC's 2-second block time requires Graph Node tuning:

- Reduce `ETHEREUM_POLLING_INTERVAL` for faster detection
- Increase `GRAPH_ETHEREUM_TARGET_TRIGGERS_PER_BLOCK` for throughput
- Monitor `eth_getLogs` batch sizes for RPC provider limits

---

