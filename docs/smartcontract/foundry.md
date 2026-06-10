---
title: Deploy and Verify with Foundry
description: Complete Foundry guide for XDC — forge init, config, compile, deploy to Apothem Testnet, verify on XDCScan, and cast interaction. Copy-paste ready.
---

Difficulty: Beginner | Time: ~15 minutes | Tools: Rust toolchain, Foundry, MetaMask

# Deploy and Verify with Foundry

Foundry is a fast, modular toolkit for Ethereum development written in Rust. It is significantly faster than Hardhat for compilation and testing. This guide takes you from an empty folder to a deployed, verified smart contract on the XDC Apothem Testnet.

By the end you will have:

- A working Foundry project configured for XDC Mainnet and Apothem Testnet
- A deployed `Counter` contract on Apothem
- The contract verified on XDCScan Testnet
- A `cast` command to read and write the counter value

## Prerequisites

- [Rust](https://rustup.rs/) installed — `rustc --version` should print `1.7x.x` or higher
- [Foundry](https://getfoundry.sh/) installed — `forge --version` should print `0.2.x`
- MetaMask with the XDC Apothem Testnet added ([Quick Guide](../xdcchain/developers/quick-guide.md) if you need help)
- Test XDC from [faucet.apothem.network](https://faucet.apothem.network)

> 💡 **XDC Address Format**  
> XDCScan shows addresses with an `xdc` prefix (e.g., `xdc1234…`). EVM tools like Foundry use the `0x` prefix (e.g., `0x1234…`). Both refer to the same account — the prefix is the only difference. Foundry configs always use `0x`.

---

## Step 1 — Create the Project

Open a terminal and run:

```bash title="Terminal"
mkdir xdc-foundry && cd xdc-foundry
forge init
```

Your folder should now contain:

```
xdc-foundry/
├── foundry.toml
├── script/
├── src/
├── test/
├── lib/
└── .github/
```

---

## Step 2 — Configure Foundry for XDC

Replace the contents of `foundry.toml` with the following. This adds both XDC Mainnet and Apothem Testnet, plus the XDCScan API endpoints for automatic verification.

```toml title="foundry.toml"
[profile.default]
src = "src"
out = "out"
libs = ["lib"]

[rpc_endpoints]
xdc = "https://rpc.xinfin.network"
apothem = "https://rpc.apothem.network"

[etherscan]
xdc = { key = "none", url = "https://xdcscan.com/api" }
apothem = { key = "none", url = "https://testnet.xdcscan.com/api" }
```

Save your deployer private key in a `.env` file (never commit this file):

```bash title="Terminal"
echo "PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE" > .env
```

> ⚠️ **Security**  
> `.env` contains your private key. Add it to `.gitignore` immediately:
> ```bash
> echo ".env" >> .gitignore
> ```

---

## Step 3 — Write the Counter Contract

Replace the contents of `src/Counter.sol` with:

```solidity title="src/Counter.sol"
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Counter {
    uint256 public count;

    event CountIncremented(uint256 newCount);

    function increment() external {
        count += 1;
        emit CountIncremented(count);
    }

    function decrement() external {
        require(count > 0, "Counter: cannot decrement below zero");
        count -= 1;
    }

    function getCount() external view returns (uint256) {
        return count;
    }
}
```

> 💡 **What this does**  
> `count` is a public state variable. `increment()` adds 1 and emits an event. `decrement()` subtracts 1 with a safety check. `getCount()` returns the current value.

---

## Step 4 — Compile

```bash title="Terminal"
forge build
```

**Expected output:**

```
[⠊] Compiling...
[⠒] Compiling 1 files with Solc 0.8.24
[⠢] Solc 0.8.24 finished in 1.23s
Compiler run successful!
```

If you see errors, check that the Solidity version in `foundry.toml` matches the `pragma` line in `Counter.sol`.

---

## Step 5 — Deploy to Apothem Testnet

Create the deployment script at `script/Counter.s.sol`:

```bash title="Terminal"
touch script/Counter.s.sol
```

Paste this into `script/Counter.s.sol`:

```solidity title="script/Counter.s.sol"
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {Counter} from "../src/Counter.sol";

contract CounterScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        Counter counter = new Counter();

        vm.stopBroadcast();

        console.log("Counter deployed to:", address(counter));
    }
}
```

Run the deployment:

```bash title="Terminal"
source .env
forge script script/Counter.s.sol --rpc-url apothem --broadcast
```

**Expected output:**

```
[⠊] Compiling...
[⠒] Compiling 2 files with Solc 0.8.24
[⠢] Solc 0.8.24 finished in 1.23s
Compiler run successful!
Script ran successfully.

== Logs ==
  Counter deployed to: 0x1234567890abcdef1234567890abcdef12345678

## Setting up (1) EVMs.
==========================

Chain 51

Estimated gas price: 0.25 gwei

Estimated total gas used for script: 150000

Estimated amount required: 0.0000375 ETH

==========================

##### 51
✅  [Success]Hash: 0x...
Block: 12345678
```

Copy the contract address — you will need it for verification and interaction.

> ⏱️ **XDC Confirmations**  
> XDC has 2-second block times. Deployment usually confirms within 5–10 seconds.

---

## Step 6 — Verify on XDCScan

Run the Foundry verify command with your deployed address:

```bash title="Terminal"
forge verify-contract 0xYOUR_CONTRACT_ADDRESS src/Counter.sol:Counter --chain 51 --verifier-url https://testnet.xdcscan.com/api
```

**Expected output:**

```
Start verifying contract `Counter` deployed on 51

Submitting verification for [src/Counter.sol:Counter] 0xYOUR_CONTRACT_ADDRESS.
Submitted contract for verification:
	Response: `OK`
	GUID: `abc123...`
	URL: https://testnet.xdcscan.com/address/0xYOUR_CONTRACT_ADDRESS
```

Click the XDCScan link to confirm the source code is visible.

> 🔍 **Verification Failed?**  
> See the [Troubleshooting](#troubleshooting) section below.

---

## Step 7 — Interact with `cast`

Foundry's `cast` command lets you read and write to contracts directly from the terminal.

### Read the current count

```bash title="Terminal"
cast call 0xYOUR_CONTRACT_ADDRESS "getCount()" --rpc-url https://rpc.apothem.network
```

**Expected output:**

```
0
```

### Increment the counter

```bash title="Terminal"
cast send 0xYOUR_CONTRACT_ADDRESS "increment()" --rpc-url https://rpc.apothem.network --private-key $PRIVATE_KEY
```

**Expected output:**

```
blockHash               0x...
blockNumber             12345679
contractAddress         
...
status                  1 (success)
transactionHash         0x...
```

### Read again to confirm

```bash title="Terminal"
cast call 0xYOUR_CONTRACT_ADDRESS "getCount()" --rpc-url https://rpc.apothem.network
```

**Expected output:**

```
1
```

> 💡 **Cast Tips**  
> - `cast call` is for read-only functions (no gas cost)  
> - `cast send` is for state-changing functions (requires private key and gas)  
> - `cast --to-dec` converts hex output to decimal  
> - `cast balance 0xYOUR_ADDRESS --rpc-url https://rpc.apothem.network` checks your wallet balance

---

## Step 8 — Deploy to XDC Mainnet (Optional)

Once you are confident with the testnet flow, deploying to mainnet is identical — just change the RPC URL and ensure your wallet has real XDC for gas.

```bash title="Terminal"
forge script script/Counter.s.sol --rpc-url xdc --broadcast
forge verify-contract 0xYOUR_MAINNET_CONTRACT_ADDRESS src/Counter.sol:Counter --chain 50 --verifier-url https://xdcscan.com/api
```

> ⚠️ **Mainnet costs real XDC**  
> XDC gas fees are low (~0.0001 XDC per transaction), but you still need mainnet XDC in your deployer wallet. Buy XDC on exchanges or bridge from other chains.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `Invalid API Key` during verify | Foundry expects a key | Set `key = "none"` in `foundry.toml` — XDCScan does not require a key |
| `Network not found` | RPC endpoint misconfigured | Double-check the `[rpc_endpoints]` section in `foundry.toml` |
| `Nonce too high` | Wallet and chain nonces out of sync | Reset MetaMask account: Settings → Advanced → Reset Account |
| `insufficient funds` | Wallet has no test XDC | Visit [faucet.apothem.network](https://faucet.apothem.network) |
| `cannot estimate gas` | Contract constructor reverts | Check constructor arguments and contract logic |
| Verification hangs | XDCScan API delay | Wait 30 seconds and retry; check the contract page manually |
| `vm.envUint` not found | `PRIVATE_KEY` not loaded | Run `source .env` before `forge script` |

---

## Next Steps

- [Verify with Hardhat](./hardhat.md) — learn the JavaScript-based alternative to Foundry
- [XRC20 Token Guide](./tokens.md) — deploy a fungible token with OpenZeppelin
- [Security Best Practices](../security/security-practices.md) — audit checklist before mainnet
