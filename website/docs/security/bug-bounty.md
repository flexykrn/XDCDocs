---
title: Bug Bounty and Responsible Disclosure
sidebar_position: 7
description: How to report security vulnerabilities in the XDC protocol, contracts, and documentation — scope, rules of engagement, safe harbor, and recognition.
---

# Bug Bounty and Responsible Disclosure

Security researchers make the XDC ecosystem safer. If you believe you have found a vulnerability, we want to hear from you through responsible disclosure — report it privately, give maintainers time to fix it, and help keep users' funds safe. For the broader security posture of the network, see [Security Overview](/docs/security/overview).

## Scope

Reports are welcome for vulnerabilities in:

- **Protocol and client software** — the XDPoS consensus implementation, node client code, and networking layer (e.g. issues in the [XinFin-Node](https://github.com/XinFinOrg/XinFin-Node) tooling and related client repositories).
- **Smart contracts** — official or ecosystem contracts where a flaw could lead to loss of funds, privilege escalation, or contract bricking. Known vulnerability classes to look for are catalogued in [Smart Contract Vulnerabilities](/docs/security/vulnerabilities).
- **Documentation and developer tooling** — errors in these docs that would lead developers into insecure practices, or flaws in officially maintained tooling.

Out of scope: third-party dApps and contracts not maintained by the XDC ecosystem (report those to their own teams), social engineering, physical attacks, and vulnerabilities requiring already-compromised user devices.

## Rules of Engagement

:::warning
Do not exploit a vulnerability on mainnet beyond the minimum needed to prove it exists, and do not disclose it publicly before a fix is available.
:::

- **No public disclosure before fix** — report privately first; coordinate a disclosure timeline with the maintainers.
- **No mainnet exploitation** — never drain, move, or interfere with funds that are not yours. Demonstrate impact on the **Apothem testnet** (Chain ID 51) or a local fork wherever possible. Get test XDC from the [faucet](https://faucet.apothem.network).
- **No denial of service** — do not degrade mainnet or testnet availability while testing.
- **Respect privacy** — do not access, modify, or exfiltrate user data.
- **Act in good faith** — stop testing and report as soon as you have confirmed a vulnerability.

## How to Report

Please report vulnerabilities through the official XDC community channels at [xinfin.org/join-community](https://xinfin.org/join-community), where you will be directed to the appropriate security contacts.

A good report includes:

1. **Summary** — what the vulnerability is and what an attacker could do with it.
2. **Affected component** — repository, contract address, or documentation page.
3. **Reproduction steps** — a minimal proof of concept, ideally on Apothem or a local environment.
4. **Impact assessment** — funds at risk, privileges gained, or users affected.
5. **Suggested fix** (optional) — always appreciated.

You can expect an acknowledgement of your report, a severity assessment, and coordination on a fix and disclosure timeline. If the issue is time-critical (e.g. an actively exploited contract), say so clearly in your report.

## Safe Harbor

If you follow the rules of engagement above — good-faith research, no mainnet exploitation, no public disclosure before a fix — the XDC ecosystem will not pursue legal action against you for your research. Specifically, acting within these rules means:

- Your testing is treated as authorized security research.
- You will not be reported to law enforcement for the research itself.
- Any accidental access to data beyond the vulnerability proof should be reported and deleted, not retained.

Safe harbor does not cover exploitation of user funds, extortion, or disclosure of the vulnerability to third parties before coordination.

## Rewards and Recognition

Reward details for qualifying reports are shared through the official channels above. Bounty amounts are not published in this documentation; eligibility and any reward are determined case by case based on severity, impact, quality of the report, and whether the finding is novel.

With your permission, researchers who contribute valid reports may be publicly acknowledged for their contribution to the network's security.

## For Project Teams

If you run a dApp or contract on XDC, do not wait for someone else's bounty program to protect you — publish your own disclosure contact, keep your contracts audited (see [Audit Preparation](/docs/security/audit-prep)), and have an [Incident Response](/docs/security/incident-response) plan ready before you need it.
