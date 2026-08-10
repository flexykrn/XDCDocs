---
title: Layer 2 Scaling
sidebar_position: 8
description: "How XDC approaches scaling: a fast base layer, the XDC Subnet Layer-2 framework, and how sidechains and rollups compare for builders."
---

# Layer 2 Scaling on XDC

## XDC's Native Scaling Position

XDC's base layer is already fast by design. According to the [XDC Chain introduction](/docs/xdc-chain), the network achieves a remarkable 2,000+ transactions per second (TPS) with 2-second block times and near-zero gas fees, secured by the XDPoS consensus family ([XDPoS](/docs/xdc-chain/xdpos), [XDPoS 2.0](/docs/xdc-chain/xdpos2)).

Because the Layer 1 already offers high throughput, low latency, and minimal fees, the primary motivation for Layer 2 on XDC is not raw transaction speed. Instead, Layer 2 on XDC is driven by enterprise requirements: **privacy** (ledgers not visible to the public), **sovereignty** (owning the infrastructure), and **compliance** (permissioned validator sets).

## Scaling Taxonomy

| Approach | Security Model | Data Availability | Finality | Status on XDC |
|----------|---------------|-------------------|----------|---------------|
| **Sidechain** | Own validator set; independent of L1 | On the sidechain itself | Sidechain's own consensus | Conceptual; no documented deployment |
| **Optimistic rollup** | Inherits L1 security via fraud proofs | Transaction data posted to L1 | Delayed (challenge window) | Conceptual; not documented or deployed |
| **ZK-rollup** | Inherits L1 security via validity proofs | Proof + data posted to L1 | Fast once proof is verified | Conceptual; not documented or deployed |
| **Validium** | Validity proofs on L1, data kept off-chain | Off-chain (data availability committee) | Fast once proof is verified | Conceptual; not documented or deployed |
| **Subnet** | Sum of subnet AND XDC mainnet security, via checkpointing | Private to the subnet; only consensus checkpoints reach L1 | Subnet consensus, anchored by mainnet checkpoints | **Shipped and documented** — see [XDC Subnet](/docs/subnet/overview) |

## XDC Subnet: XDC's Layer 2 Answer

[XDC Subnet](/docs/subnet/overview) is the Layer-2 scaling and privacy solution tailor-designed by XDC's core protocol team for enterprise and institutional customers. As explained in the [Subnet overview](/docs/subnet/overview), the design deliberately favors checkpointing over rollups: optimistic rollups still expose all L2 transaction data on L1 (breaking privacy), while ZK computation is slow and supports only limited use cases such as token transfers — neither fits the diverse business needs of XDC's enterprise customers.

With XDC Subnet:

- The customer runs a **sovereign, permissioned, high-performing blockchain** wholly owned by them, driven by the XDC2.0 consensus engine.
- A **relayer** checkpoints critical consensus data of the subnet to the XDC mainnet — see the [Relayer component](/docs/subnet/components/relayer).
- A **checkpoint smart contract** on the XDC mainnet verifies and records those checkpoints — see the [Checkpoint Contract](/docs/subnet/components/checkpoint-contract).
- The resulting security level is equivalent to the **sum security of the subnet AND the XDC mainnet**.
- Subnet transactions enjoy **total privacy** — no visibility of subnet transactions on the XDC mainnet.
- The subnet has **native EVM smart contract support** and full compatibility with XDC's SDK and tooling (explorer, forensic monitoring).

To deploy your own subnet, follow [Setting Up Your Subnet](/docs/subnet/deployment-guide/setting-up-your-subnet).

## When You Need Which

| Your situation | Recommended layer |
|----------------|-------------------|
| Public dApp, DeFi protocol, NFT project, or token | **XDC mainnet directly** — 2,000+ TPS, 2-second finality, and near-zero fees are sufficient for most workloads |
| Enterprise or institution needing transaction privacy, a permissioned validator set, or owned infrastructure | **[XDC Subnet](/docs/subnet/overview)** checkpointed to mainnet |
| Extreme public throughput beyond mainnet capacity | A rollup-style design is **conceptually possible** on XDC — its EVM compatibility means an OP-stack-style optimistic rollup could theoretically settle to XDC — but this is **not documented or deployed** today. The only rollup discussion in these docs is the design rationale in the [Subnet overview](/docs/subnet/overview) explaining why XDC chose subnets instead |
| Consortia of untrusted partners needing shared infrastructure | **XDC Subnet** — each subnet has its own security and resiliency besides that provided by the parent chain |

## Bridging Between Layers

Moving assets and data between XDC mainnet and other layers or chains is handled by bridges and relayers:

- **Cross-chain bridges**: see [Bridges](/docs/xdc-chain/developers/bridges) for bridges connecting XDC with external networks.
- **Subnet relayer**: the [Relayer](/docs/subnet/components/relayer) is the conduit that checkpoints subnet consensus data to the mainnet's checkpoint contract.

## XDC Zero

[XDC Zero](/docs/subnet/components/xdc-zero) is a **cross-chain interoperability framework** (despite the name, it is not a zero-knowledge proof system). It enables frictionless data transmission and rigorous validation between an XDC Subnet and the XDC parent chain through three key components:

- **Oracle** — safely transfers pivotal data (notably block headers) between source and target blockchains, using CSC contracts to safeguard block header integrity on the destination chain.
- **Relayer** — extracts payload data from the source chain's Endpoint contract and channels it to the counterpart on the target chain, ensuring exact and secure relay of transaction data.
- **Endpoint** — the nexus for cross-chain communication: receiving and dispatching data packets, onboarding new chains, authenticating transactions, and exposing cross-chain payload data to applications.

In the scaling story, XDC Zero is the connective tissue that turns a subnet from an isolated private chain into a fully interoperable Layer 2 within the XDC ecosystem. See the [XDC Zero component page](/docs/subnet/components/xdc-zero) for its full API surface.

## Decision Guide for Builders

1. **Does your application need to be publicly accessible and composable with the XDC DeFi ecosystem?**
   - Yes → Build directly on **XDC mainnet**.
2. **Do your transactions or ledger need to stay private from the public?**
   - Yes → Deploy an **[XDC Subnet](/docs/subnet/deployment-guide/setting-up-your-subnet)**.
3. **Do you need throughput beyond what a single XDC mainnet deployment offers?**
   - Mainnet's 2,000+ TPS covers most workloads; for isolated enterprise-scale throughput, a subnet gives you a dedicated chain. Public rollup infrastructure is conceptual only — not available today.
4. **Do you have compliance requirements (permissioned validators, KYC'd operators, owned infrastructure)?**
   - Yes → **XDC Subnet** with your own validator set, checkpointed to mainnet for added security.

## See Also

- [XDC Subnet Overview](/docs/subnet/overview)
- [XDPoS 2.0 Consensus](/docs/xdc-chain/xdpos2)
- [XDC Architecture](/docs/learn/xdc-architecture)
