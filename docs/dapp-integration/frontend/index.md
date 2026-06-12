---
title: Frontend Framework Integration — React, Vue, Angular on XDC
description: Frontend integration guide for XDC — React with wagmi/viem, Vue with Web3.js, Angular with services, and state management.
---

# Frontend Framework Integration

Integrating XDC with frontend frameworks requires wallet connection, state management, and transaction handling. This guide covers React, Vue, and Angular.

## React Integration

### wagmi + viem Setup

```bash
npm install wagmi viem @tanstack/react-query
```

```typescript title="src/config/wagmi.ts"
import { createConfig, http } from 'wagmi'
import { xdc, xdcTestnet } from 'wagmi/chains'
import { injected, walletConnect } from 'wagmi/connectors'

export const config = createConfig({
  chains: [xdc, xdcTestnet],
  connectors: [
    injected(),
    walletConnect({
      projectId: 'YOUR_PROJECT_ID',
      metadata: {
        name: 'XDC dApp',
        description: 'XDC dApp',
        url: 'https://yourapp.com',
        icons: ['https://yourapp.com/icon.png']
      }
    })
  ],
  transports: {
    [xdc.id]: http('https://rpc.xdc.org'),
    [xdcTestnet.id]: http('https://rpc.apothem.network')
  }
})
```

### RainbowKit Integration

```bash
npm install @rainbow-me/rainbowkit
```

```typescript title="src/main.tsx"
import '@rainbow-me/rainbowkit/styles.css'
import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const config = getDefaultConfig({
  appName: 'XDC dApp',
  projectId: 'YOUR_PROJECT_ID',
  chains: [xdc, xdcTestnet],
  transports: {
    [xdc.id]: http('https://rpc.xdc.org'),
    [xdcTestnet.id]: http('https://rpc.apothem.network')
  }
})

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <WagmiProvider config={config}>
    <QueryClientProvider client={queryClient}>
      <RainbowKitProvider>
        <App />
      </RainbowKitProvider>
    </QueryClientProvider>
  </WagmiProvider>
)
```

### Custom Wallet Connection

```typescript title="src/components/ConnectWallet.tsx"
import { useAccount, useConnect, useDisconnect } from 'wagmi'

export function ConnectWallet() {
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()

  if (isConnected) {
    return (
      <div>
        <p>Connected: {address}</p>
        <button onClick={() => disconnect()}>Disconnect</button>
      </div>
    )
  }

  return (
    <div>
      {connectors.map((connector) => (
        <button
          key={connector.uid}
          onClick={() => connect({ connector })}
        >
          Connect {connector.name}
        </button>
      ))}
    </div>
  )
}
```

### Transaction Handling

```typescript title="src/components/SendTransaction.tsx"
import { useSendTransaction, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther } from 'viem'

export function SendTransaction() {
  const { data: hash, sendTransaction } = useSendTransaction()
  const { isLoading, isSuccess } = useWaitForTransactionReceipt({ hash })

  return (
    <div>
      <button
        disabled={isLoading}
        onClick={() =>
          sendTransaction({
            to: 'xdc1234567890abcdef...',
            value: parseEther('0.01')
          })
        }
      >
        {isLoading ? 'Sending...' : 'Send 0.01 XDC'}
      </button>
      {isSuccess && <p>Transaction confirmed!</p>}
      {hash && <p>Hash: {hash}</p>}
    </div>
  )
}
```

## Vue Integration

### Web3.js with Composition API

```bash
npm install web3 @vue/composition-api
```

```typescript title="src/composables/useWeb3.ts"
import { ref, computed } from 'vue'
import Web3 from 'web3'

const XDC_RPC = 'https://rpc.xdc.org'
const XDC_TESTNET_RPC = 'https://rpc.apothem.network'

export function useWeb3() {
  const web3 = ref(new Web3(XDC_RPC))
  const account = ref('')
  const chainId = ref(0)
  const isConnected = computed(() => !!account.value)

  async function connect() {
    if (window.ethereum) {
      web3.value = new Web3(window.ethereum)
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      })
      account.value = accounts[0]
      chainId.value = await web3.value.eth.getChainId()
    }
  }

  async function sendTransaction(to: string, value: string) {
    return await web3.value.eth.sendTransaction({
      from: account.value,
      to,
      value: web3.value.utils.toWei(value, 'ether'),
      gas: 21000,
      gasPrice: await web3.value.eth.getGasPrice()
    })
  }

  return {
    web3,
    account,
    chainId,
    isConnected,
    connect,
    sendTransaction
  }
}
```

### Component Example

```vue title="src/components/WalletConnect.vue"
<template>
  <div>
    <button v-if="!isConnected" @click="connect">
      Connect Wallet
    </button>
    <div v-else>
      <p>Account: {{ account }}</p>
      <p>Chain ID: {{ chainId }}</p>
      <button @click="sendTx">Send Transaction</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useWeb3 } from '../composables/useWeb3'

const { account, chainId, isConnected, connect, sendTransaction } = useWeb3()

async function sendTx() {
  const receipt = await sendTransaction(
    'xdc1234567890abcdef...',
    '0.01'
  )
  console.log('Transaction hash:', receipt.transactionHash)
}
</script>
```

## Angular Integration

### Service Architecture

```typescript title="src/app/services/web3.service.ts"
import { Injectable } from '@angular/core'
import { BehaviorSubject, Observable } from 'rxjs'
import Web3 from 'web3'

@Injectable({
  providedIn: 'root'
})
export class Web3Service {
  private web3: Web3
  private accountSubject = new BehaviorSubject<string>('')
  private chainIdSubject = new BehaviorSubject<number>(0)

  public account$: Observable<string> = this.accountSubject.asObservable()
  public chainId$: Observable<number> = this.chainIdSubject.asObservable()

  constructor() {
    this.web3 = new Web3('https://rpc.xdc.org')
  }

  async connect(): Promise<void> {
    if (window.ethereum) {
      this.web3 = new Web3(window.ethereum)
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      })
      this.accountSubject.next(accounts[0])
      const chainId = await this.web3.eth.getChainId()
      this.chainIdSubject.next(chainId)
    }
  }

  async sendTransaction(to: string, value: string): Promise<any> {
    const from = this.accountSubject.value
    return await this.web3.eth.sendTransaction({
      from,
      to,
      value: this.web3.utils.toWei(value, 'ether'),
      gas: 21000,
      gasPrice: await this.web3.eth.getGasPrice()
    })
  }

  disconnect(): void {
    this.accountSubject.next('')
    this.chainIdSubject.next(0)
  }
}
```

### Component with Dependency Injection

```typescript title="src/app/components/wallet/wallet.component.ts"
import { Component } from '@angular/core'
import { Web3Service } from '../../services/web3.service'
import { Observable } from 'rxjs'

@Component({
  selector: 'app-wallet',
  template: `
    <div *ngIf="!(account$ | async)">
      <button (click)="connect()">Connect Wallet</button>
    </div>
    <div *ngIf="account$ | async as account">
      <p>Account: {{ account }}</p>
      <p>Chain ID: {{ chainId$ | async }}</p>
      <button (click)="sendTransaction()">Send 0.01 XDC</button>
      <button (click)="disconnect()">Disconnect</button>
    </div>
  `
})
export class WalletComponent {
  account$: Observable<string>
  chainId$: Observable<number>

  constructor(private web3Service: Web3Service) {
    this.account$ = this.web3Service.account$
    this.chainId$ = this.web3Service.chainId$
  }

  async connect() {
    await this.web3Service.connect()
  }

  async sendTransaction() {
    const receipt = await this.web3Service.sendTransaction(
      'xdc1234567890abcdef...',
      '0.01'
    )
    console.log('Transaction:', receipt)
  }

  disconnect() {
    this.web3Service.disconnect()
  }
}
```

## State Management Patterns

### Connection State

```typescript
interface ConnectionState {
  isConnected: boolean
  address: string | null
  chainId: number | null
  connector: string | null
}
```

### Account State

```typescript
interface AccountState {
  balance: string
  nonce: number
  transactions: Transaction[]
}
```

### Transaction State

```typescript
interface TransactionState {
  hash: string
  status: 'pending' | 'confirmed' | 'failed'
  from: string
  to: string
  value: string
  gasUsed: string
}
```

## Error Handling

| Error | Cause | Fix |
|-------|-------|-----|
| "User rejected" | User denied connection | Show friendly message |
| "Network mismatch" | Wrong chain | Prompt to switch chain |
| "Insufficient funds" | Low balance | Show warning |
| "Gas estimation failed" | Contract error | Check contract address |
| "Nonce too low" | Sync issue | Refresh and retry |

## Mobile Responsiveness

```css
/* Mobile-first styles */
.wallet-connect {
  width: 100%;
  padding: 12px;
  font-size: 16px;
}

@media (min-width: 768px) {
  .wallet-connect {
    width: auto;
    padding: 8px 16px;
  }
}
```

## Next Steps

- [Mobile Wallets →](../mobile/index.md) — iOS and Android integration
- [Wallet Adapters →](../wallet-adapters/index.md) — Multi-wallet support
