---
title: Wallet Adapters — Multi-Wallet Support for dApps on XDC
description: Wallet adapter guide for XDC — MetaMask, WalletConnect, Trust Wallet, XDCPay, Ledger, Coinbase Wallet integration.
---

# Wallet Adapters

Supporting multiple wallets is essential for dApp adoption. This guide covers unified adapter architecture for 6+ wallets on XDC.

## Supported Wallets

| Wallet | Type | Connection | Mobile | Hardware |
|--------|------|------------|--------|----------|
| **MetaMask** | Browser Extension | Injected | ✅ | ❌ |
| **WalletConnect** | QR Code / Deep Link | Universal | ✅ | ❌ |
| **Trust Wallet** | Mobile App | Deep Link | ✅ | ❌ |
| **XDCPay** | Browser Extension | Injected | ❌ | ❌ |
| **Ledger** | Hardware | USB / Bluetooth | ❌ | ✅ |
| **Coinbase Wallet** | Mobile + Extension | SDK | ✅ | ❌ |

## Adapter Architecture

```typescript
interface WalletAdapter {
  name: string
  icon: string
  connect(): Promise<string> // Returns address
  disconnect(): Promise<void>
  signMessage(message: string): Promise<string>
  sendTransaction(tx: Transaction): Promise<string>
  on(event: string, callback: Function): void
  off(event: string, callback: Function): void
}

interface Transaction {
  from: string
  to: string
  value: string
  data?: string
  gasPrice?: string
  gasLimit?: string
}
```

## MetaMask Adapter

```typescript title="src/adapters/metamask.ts"
import { WalletAdapter } from './types'

export class MetaMaskAdapter implements WalletAdapter {
  name = 'MetaMask'
  icon = '/icons/metamask.svg'

  async connect(): Promise<string> {
    if (!window.ethereum?.isMetaMask) {
      throw new Error('MetaMask not installed')
    }

    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts'
    })

    // Switch to XDC network
    await this.switchToXDC()

    return accounts[0]
  }

  async disconnect(): Promise<void> {
    // MetaMask doesn't support programmatic disconnect
    window.location.reload()
  }

  async signMessage(message: string): Promise<string> {
    const accounts = await window.ethereum.request({
      method: 'eth_accounts'
    })

    return await window.ethereum.request({
      method: 'personal_sign',
      params: [message, accounts[0]]
    })
  }

  async sendTransaction(tx: Transaction): Promise<string> {
    return await window.ethereum.request({
      method: 'eth_sendTransaction',
      params: [tx]
    })
  }

  on(event: string, callback: Function): void {
    window.ethereum?.on(event, callback)
  }

  off(event: string, callback: Function): void {
    window.ethereum?.removeListener(event, callback)
  }

  private async switchToXDC(): Promise<void> {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x32' }] // 50 in hex
      })
    } catch (error: any) {
      if (error.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0x32',
            chainName: 'XDC Network',
            nativeCurrency: {
              name: 'XDC',
              symbol: 'XDC',
              decimals: 18
            },
            rpcUrls: ['https://rpc.xdc.org'],
            blockExplorerUrls: ['https://xdcscan.io']
          }]
        })
      }
    }
  }
}
```

## WalletConnect Adapter

```typescript title="src/adapters/walletconnect.ts"
import { WalletConnectModal } from '@walletconnect/modal'
import { WalletAdapter } from './types'

export class WalletConnectAdapter implements WalletAdapter {
  name = 'WalletConnect'
  icon = '/icons/walletconnect.svg'
  private modal: WalletConnectModal

  constructor() {
    this.modal = new WalletConnectModal({
      projectId: 'YOUR_PROJECT_ID',
      chains: ['eip155:50'],
      metadata: {
        name: 'XDC dApp',
        description: 'XDC dApp',
        url: 'https://yourapp.com',
        icons: ['https://yourapp.com/icon.png']
      }
    })
  }

  async connect(): Promise<string> {
    const { uri, approval } = await this.modal.connect()

    // Display QR code
    this.modal.openModal({ uri })

    const session = await approval()
    this.modal.closeModal()

    return session.namespaces.eip155.accounts[0].split(':')[2]
  }

  async disconnect(): Promise<void> {
    await this.modal.disconnect()
  }

  async signMessage(message: string): Promise<string> {
    return await this.modal.request({
      method: 'personal_sign',
      params: [message, this.getAddress()]
    })
  }

  async sendTransaction(tx: Transaction): Promise<string> {
    return await this.modal.request({
      method: 'eth_sendTransaction',
      params: [tx]
    })
  }

  on(event: string, callback: Function): void {
    this.modal.on(event, callback)
  }

  off(event: string, callback: Function): void {
    this.modal.off(event, callback)
  }

  private getAddress(): string {
    // Get from session
    return ''
  }
}
```

## XDCPay Adapter

```typescript title="src/adapters/xdcpay.ts"
import { WalletAdapter } from './types'

export class XDCPayAdapter implements WalletAdapter {
  name = 'XDCPay'
  icon = '/icons/xdcpay.svg'

  async connect(): Promise<string> {
    if (!window.xdc) {
      throw new Error('XDCPay not installed')
    }

    const accounts = await window.xdc.request({
      method: 'eth_requestAccounts'
    })

    return accounts[0]
  }

  async disconnect(): Promise<void> {
    window.location.reload()
  }

  async signMessage(message: string): Promise<string> {
    const accounts = await window.xdc.request({
      method: 'eth_accounts'
    })

    return await window.xdc.request({
      method: 'personal_sign',
      params: [message, accounts[0]]
    })
  }

  async sendTransaction(tx: Transaction): Promise<string> {
    return await window.xdc.request({
      method: 'eth_sendTransaction',
      params: [tx]
    })
  }

  on(event: string, callback: Function): void {
    window.xdc?.on(event, callback)
  }

  off(event: string, callback: Function): void {
    window.xdc?.removeListener(event, callback)
  }
}
```

## Ledger Adapter

```typescript title="src/adapters/ledger.ts"
import TransportWebUSB from '@ledgerhq/hw-transport-webusb'
import Eth from '@ledgerhq/hw-app-eth'
import { WalletAdapter } from './types'

export class LedgerAdapter implements WalletAdapter {
  name = 'Ledger'
  icon = '/icons/ledger.svg'
  private eth: Eth | null = null

  async connect(): Promise<string> {
    const transport = await TransportWebUSB.create()
    this.eth = new Eth(transport)

    const { address } = await this.eth.getAddress("44'/550'/0'/0/0")
    return address
  }

  async disconnect(): Promise<void> {
    this.eth = null
  }

  async signMessage(message: string): Promise<string> {
    if (!this.eth) throw new Error('Not connected')

    const result = await this.eth.signPersonalMessage(
      "44'/550'/0'/0/0",
      Buffer.from(message).toString('hex')
    )

    return result.r + result.s + result.v
  }

  async sendTransaction(tx: Transaction): Promise<string> {
    if (!this.eth) throw new Error('Not connected')

    const serializedTx = this.serializeTransaction(tx)
    const result = await this.eth.signTransaction(
      "44'/550'/0'/0/0",
      serializedTx
    )

    // Broadcast signed transaction
    return await this.broadcast(result.serializedTx)
  }

  on(event: string, callback: Function): void {
    // Ledger doesn't support events
  }

  off(event: string, callback: Function): void {
    // Ledger doesn't support events
  }

  private serializeTransaction(tx: Transaction): string {
    // Serialize for Ledger
    return ''
  }

  private async broadcast(signedTx: string): Promise<string> {
    // Broadcast to network
    return ''
  }
}
```

## Multi-Wallet Manager

```typescript title="src/adapters/manager.ts"
import { WalletAdapter } from './types'

export class WalletManager {
  private adapters: Map<string, WalletAdapter> = new Map()
  private activeAdapter: WalletAdapter | null = null

  constructor() {
    this.registerAdapter(new MetaMaskAdapter())
    this.registerAdapter(new WalletConnectAdapter())
    this.registerAdapter(new XDCPayAdapter())
    this.registerAdapter(new LedgerAdapter())
  }

  registerAdapter(adapter: WalletAdapter): void {
    this.adapters.set(adapter.name, adapter)
  }

  async connect(walletName: string): Promise<string> {
    const adapter = this.adapters.get(walletName)
    if (!adapter) {
      throw new Error(`Wallet ${walletName} not supported`)
    }

    const address = await adapter.connect()
    this.activeAdapter = adapter
    return address
  }

  async disconnect(): Promise<void> {
    if (this.activeAdapter) {
      await this.activeAdapter.disconnect()
      this.activeAdapter = null
    }
  }

  async signMessage(message: string): Promise<string> {
    if (!this.activeAdapter) {
      throw new Error('No wallet connected')
    }
    return await this.activeAdapter.signMessage(message)
  }

  async sendTransaction(tx: Transaction): Promise<string> {
    if (!this.activeAdapter) {
      throw new Error('No wallet connected')
    }
    return await this.activeAdapter.sendTransaction(tx)
  }

  getAvailableWallets(): string[] {
    return Array.from(this.adapters.keys())
  }

  on(event: string, callback: Function): void {
    this.adapters.forEach(adapter => {
      adapter.on(event, callback)
    })
  }

  off(event: string, callback: Function): void {
    this.adapters.forEach(adapter => {
      adapter.off(event, callback)
    })
  }
}
```

## Connection State Management

```typescript
interface WalletState {
  isConnected: boolean
  address: string | null
  chainId: number | null
  walletName: string | null
  isConnecting: boolean
  error: string | null
}

class WalletStateManager {
  private state: WalletState = {
    isConnected: false,
    address: null,
    chainId: null,
    walletName: null,
    isConnecting: false,
    error: null
  }

  private listeners: Set<(state: WalletState) => void> = new Set()

  getState(): WalletState {
    return { ...this.state }
  }

  setState(partial: Partial<WalletState>): void {
    this.state = { ...this.state, ...partial }
    this.notify()
  }

  subscribe(listener: (state: WalletState) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify(): void {
    this.listeners.forEach(listener => listener(this.getState()))
  }
}
```

## Error Handling Patterns

| Error | Cause | User Message | Fallback |
|-------|-------|--------------|----------|
| **User Rejected** | User denied connection | "Connection cancelled. Please try again." | Retry |
| **Network Error** | RPC unavailable | "Network issue. Please check your connection." | Switch RPC |
| **Wrong Chain** | Connected to wrong chain | "Please switch to XDC Network." | Auto-switch |
| **Timeout** | Connection timeout | "Connection timed out. Please try again." | Retry |
| **Not Installed** | Wallet not installed | "Please install MetaMask." | Redirect to install |

## Testing Matrix

| Wallet | Chrome | Firefox | Safari | iOS | Android |
|--------|--------|---------|--------|-----|---------|
| MetaMask | ✅ | ✅ | ❌ | ✅ | ✅ |
| WalletConnect | ✅ | ✅ | ✅ | ✅ | ✅ |
| Trust Wallet | ❌ | ❌ | ❌ | ✅ | ✅ |
| XDCPay | ✅ | ❌ | ❌ | ❌ | ❌ |
| Ledger | ✅ | ✅ | ❌ | ❌ | ❌ |
| Coinbase | ✅ | ❌ | ❌ | ✅ | ✅ |

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| "Wallet not detected" | Extension not installed | Show install prompt |
| "Connection failed" | Network issue | Retry with different RPC |
| "Chain not supported" | Wrong chain ID | Add XDC network |
| "Transaction rejected" | User denied | Show error message |
| "QR code not scanning" | Camera issue | Use manual URI input |

## Next Steps

- [Mobile Wallets →](../mobile/index.md) — iOS and Android integration
- [Frontend Frameworks →](../frontend/index.md) — React, Vue, Angular
