---
title: White Paper
sidebar_position: 10
description: "The XDC Network whitepaper: technical and business overview of the protocol, consensus, tokenomics, and enterprise use cases."
---

# XDC Network White Paper

The XDC Network whitepapers provide the technical and business foundation for the protocol. Download either document below or read the executive summary on this page.

## Documents

<div className="xdc-card-grid">
  <a href="https://xinfin.org/docs/whitepaper-tech.pdf" className="xdc-card" target="_blank" rel="noopener">
    <div className="xdc-card__title">📄 Technical White Paper</div>
    <p className="xdc-card__desc">Deep technical specification of XDC Network — XDPoS 2.0 consensus, network architecture, smart contract runtime, and security model.</p>
    <span className="xdc-card__link">Download PDF →</span>
  </a>
  <a href="https://xinfin.org/docs/xdc-mica-whitepaper.pdf" className="xdc-card" target="_blank" rel="noopener">
    <div className="xdc-card__title">📄 MiCA White Paper</div>
    <p className="xdc-card__desc">XDC Network's compliance whitepaper for the EU Markets in Crypto-Assets (MiCA) regulatory framework.</p>
    <span className="xdc-card__link">Download PDF →</span>
  </a>
</div>

---

## Executive Summary

### What is XDC Network?

XDC Network is an **enterprise-grade, EVM-compatible Layer 1 blockchain** purpose-built for trade finance, real-world asset (RWA) tokenization, and institutional DeFi. It is operated by a globally distributed set of 108 Master Nodes using the XDPoS 2.0 consensus protocol.

### Key Technical Properties

| Property | Specification |
|----------|--------------|
| Consensus | XDPoS 2.0 (HotStuff BFT) |
| Block Time | 2 seconds |
| Finality | Deterministic — irreversible in 1–2 blocks |
| Throughput | 2,000+ TPS |
| Gas Fees | ~$0.0001 per transaction |
| EVM Compatibility | Full — Solidity, Hardhat, Foundry, Remix |
| Validator Set | 108 elected Master Nodes |
| Native Token | XDC |

### Why XDC for Enterprise?

XDC Network addresses three core limitations of public blockchains for institutional use:

1. **Settlement certainty** — Deterministic finality means banks and enterprises can rely on on-chain settlement without waiting for probabilistic confirmation windows.

2. **Cost predictability** — Sub-cent transaction fees remain stable regardless of network activity, enabling high-volume trade finance workflows.

3. **Regulatory compatibility** — ISO 20022 messaging support, MiCA compliance documentation, and private subnet capability (XDC Subnet) allow institutions to meet jurisdictional requirements.

### XDPoS 2.0 in Brief

The protocol is secured by [XDPoS 2.0](/docs/xdc-chain/xdpos2), which combines:
- **Delegated Proof-of-Stake** (DPoS) for validator election — energy efficient, no mining
- **HotStuff BFT** for consensus — linear message complexity, deterministic finality
- **Forensic monitoring** — cryptographic accountability for validator behavior

### Tokenomics

- **Total supply**: 37.7 billion XDC (fixed, no inflation beyond genesis)
- **Circulating supply**: ~15 billion XDC
- **Utility**: Gas fees, Master Node staking (10M XDC minimum), governance

---

## Further Reading

- [XDPoS 2.0 Consensus](/docs/xdc-chain/xdpos2) — Deep dive into the consensus mechanism
- [Enterprise Solutions](/docs/enterprise/) — Trade finance and RWA use cases
- [XDC Architecture](/docs/learn/xdc-architecture) — Network architecture overview
- [XDC Subnet](/docs/subnet/overview) — Private subnet capabilities

