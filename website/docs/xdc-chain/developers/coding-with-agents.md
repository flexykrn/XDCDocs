---
title: "Coding with AI Agents"
sidebar_position: 26
description: Use AI coding agents effectively with the XDC docs — the built-in AI assistant, llms.txt, XDC-specific prompting tips, and example prompts.
---

# Coding with AI Agents

AI coding agents (Claude Code, Cursor, Copilot, and similar tools) work well with XDC because the network is fully EVM-compatible — but they only produce correct XDC code when given the right context. This page covers the AI features built into these docs and how to point your agent at authoritative XDC information instead of letting it guess.

## The Built-in AI Assistant

Every page of this site ships with an AI assistant. Click the chat bubble in the bottom-right corner to open it.

- **Answers from the docs, with sources.** The assistant retrieves relevant sections from this documentation and answers with links back to the source pages, so you can verify what it tells you.
- **Fast answers for common questions.** Frequently asked questions (adding XDC to MetaMask, gas fees, RPC endpoints) are answered instantly from a curated FAQ layer.
- **Feedback buttons.** Use the thumbs up/down on any answer — feedback is collected to improve answer quality.
- **Conversation history.** Your chat is kept locally in your browser; clear it any time from the chat header.

Use the assistant for quick lookups while you code, but treat it like any AI: confirm critical details against the linked source pages.

## llms.txt: Give Your Agent the Whole Docs Site

The site publishes an `llms.txt` file at [https://docs.xdc.network/llms.txt](https://docs.xdc.network/llms.txt) — a plain-text index of every documentation page, formatted for language models following the [llms.txt convention](https://llmstxt.org).

To use it with your agent:

- **Claude Code:** paste the URL into the conversation, e.g. `Read https://docs.xdc.network/llms.txt and use it as reference for XDC development questions.`
- **Cursor / other editors:** add the URL to your project's context or docs settings so the agent can fetch pages on demand.
- **Any agent:** download the file and include it in your system prompt or project context.

You can also copy any single page as clean Markdown using the **Copy page** button at the bottom of each doc page, then paste it directly into your agent's context.

## Prompting Agents with XDC Specifics

Agents trained on general Ethereum knowledge get XDC wrong in predictable ways. Include these facts in your prompts to avoid the common failure modes:

| Fact | Value |
|---|---|
| **Mainnet Chain ID** | 50 |
| **Apothem Testnet Chain ID** | 51 |
| **Devnet Chain ID** | 551 |
| **Mainnet RPC** | `https://rpc.xinfin.network` |
| **Apothem RPC** | `https://rpc.apothem.network` |
| **Solidity version** | Up to `0.8.24` (`pragma solidity ^0.8.24;`) |
| **Gas price** | Low fixed price, 0.25 Gwei |
| **Test XDC** | Free from the [Apothem faucet](https://faucet.apothem.network) |

Two gotchas worth spelling out in every prompt:

1. **The `xdc` address prefix.** Explorers like XDCScan display addresses as `xdc1234...` while MetaMask and all EVM tooling use `0x1234...`. Both forms refer to the same account — only the prefix differs. Tell your agent which format your code expects, and mention the [xdc3.js SDK](/docs/xdc-chain/developers/xdc3js-sdk) if you need programmatic conversion.
2. **Solidity version cap.** Agents love generating `pragma solidity ^0.8.28;` — that will not compile for XDC. Pin `^0.8.24` explicitly.

See the [FAQ](/docs/xdc-chain/faq) for the full network details table and more troubleshooting facts.

## Example Agent Prompts

**Deploy an XRC20 token to Apothem with Hardhat:**

```
Write a Hardhat project that deploys an OpenZeppelin ERC20 token (XRC20)
to the XDC Apothem testnet. Chain ID 51, RPC https://rpc.apothem.network,
Solidity pragma ^0.8.24. Load the deployer private key from a .env file,
never hardcode it. Include the deploy script and a verification step.
```

**Read a contract from JavaScript:**

```
Using xdc3.js, read the balanceOf() of an XRC20 token at
xdc9876543210abcdef1234567890abcdef12345678 on XDC mainnet
(RPC https://rpc.xinfin.network). The address is in xdc-prefix format —
handle conversion to 0x if the library requires it.
```

**Add XDC network support to an existing dApp:**

```
I have an ethers.js dApp configured for Ethereum. Show me the minimal
changes to support XDC mainnet (chain ID 50) and Apothem testnet
(chain ID 51), including chain config objects for wallet_addEthereumChain
and the RPC endpoints.
```

## Verify Agent Output Against the Docs

Agents hallucinate — they invent RPC URLs, wrong chain IDs, and unsupported compiler versions with full confidence. Before running generated code:

- Cross-check network details against the [FAQ](/docs/xdc-chain/faq) or the [RPC endpoints](/docs/xdc-chain/developers/mainnetrpc) pages.
- Ask the built-in assistant the same question and compare answers.
- Test on Apothem first — test XDC is free, so a wrong deployment costs nothing.
- Verify deployed contracts on the explorer; see [Deployment & Verification](/docs/smart-contracts/deployment-verification).

## See Also

- [Frequently Asked Questions](/docs/xdc-chain/faq) — network details, wallets, gas, troubleshooting
- [Quick Guide: XDC Chain](/docs/xdc-chain/developers/quick-guide) — network overview and tooling
- [Developer Tools](/docs/xdc-chain/developers/dev-tools) — Hardhat, Foundry, Remix, and SDKs
