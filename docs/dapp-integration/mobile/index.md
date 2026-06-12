---
title: Mobile Wallet Integration — iOS and Android on XDC
description: Mobile wallet integration guide for XDC — WalletConnect, deep linking, Swift, Kotlin, React Native, and Flutter.
---

# Mobile Wallet Integration

Mobile wallets are the primary platform for user-facing dApps in emerging markets. This guide covers iOS, Android, and cross-platform integration.

## Supported Wallets

| Wallet | iOS | Android | Deep Link | QR Code |
|--------|-----|---------|-----------|---------|
| **MetaMask** | ✅ | ✅ | ✅ | ✅ |
| **Trust Wallet** | ✅ | ✅ | ✅ | ✅ |
| **XDCPay** | ✅ | ✅ | ✅ | ✅ |
| **WalletConnect** | ✅ | ✅ | ✅ | ✅ |
| **Ledger Live** | ✅ | ✅ | ❌ | ✅ |

## iOS Integration (Swift)

### WalletConnect Setup

```swift
import WalletConnectSwift

class WalletConnectManager: ObservableObject {
    @Published var session: Session?
    @Published var address: String?
    
    let client: WalletConnectClient
    
    init() {
        let metadata = AppMetadata(
            name: "XDC dApp",
            description: "XDC dApp Integration",
            url: "https://yourapp.com",
            icons: ["https://yourapp.com/icon.png"]
        )
        
        client = WalletConnectClient(
            projectId: "YOUR_PROJECT_ID",
            metadata: metadata
        )
        
        setupHandlers()
    }
    
    func connect() {
        let uri = client.connect(
            chains: [Chain.xdcMainnet, Chain.xdcTestnet]
        )!
        
        // Present QR code or deep link
        presentConnectionURI(uri)
    }
    
    func sendTransaction(to: String, value: String) {
        let tx = Transaction(
            from: address!,
            to: to,
            value: value,
            data: "0x",
            gasPrice: "0x1bf08eb000",
            gasLimit: "0x5208"
        )
        
        client.request(
            topic: session!.topic,
            method: "eth_sendTransaction",
            params: [tx]
        )
    }
    
    private func setupHandlers() {
        client.onSessionSettled = { [weak self] settledSession in
            self?.session = settledSession
            self?.address = settledSession.accounts.first?.address
        }
    }
}
```

### Deep Linking

```swift
// Info.plist
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLName</key>
        <string>com.yourapp.xdc</string>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>xdcapp</string>
        </array>
    </dict>
</array>

// AppDelegate.swift
func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey : Any] = [:]) -> Bool {
    if url.scheme == "xdcapp" {
        handleDeepLink(url)
        return true
    }
    return false
}
```

## Android Integration (Kotlin)

### WalletConnect Setup

```kotlin
class WalletConnectManager(private val context: Context) {
    private val client: WalletConnectClient
    var session: Session? = null
    var address: String? = null
    
    init {
        val metadata = AppMetaData(
            name = "XDC dApp",
            description = "XDC dApp Integration",
            url = "https://yourapp.com",
            icons = listOf("https://yourapp.com/icon.png")
        )
        
        client = WalletConnectClient(
            context = context,
            projectId = "YOUR_PROJECT_ID",
            metadata = metadata
        )
        
        setupHandlers()
    }
    
    fun connect() {
        val uri = client.connect(
            chains = listOf(Chain.XDC_MAINNET, Chain.XDC_TESTNET)
        )
        
        // Present QR code or deep link
        presentConnectionURI(uri)
    }
    
    fun sendTransaction(to: String, value: String) {
        val tx = Transaction(
            from = address!!,
            to = to,
            value = value,
            data = "0x",
            gasPrice = "0x1bf08eb000",
            gasLimit = "0x5208"
        )
        
        client.request(
            topic = session!!.topic,
            method = "eth_sendTransaction",
            params = listOf(tx)
        )
    }
    
    private fun setupHandlers() {
        client.onSessionSettled = { settledSession ->
            session = settledSession
            address = settledSession.accounts.first().address
        }
    }
}
```

### Intent Handling

```kotlin
// AndroidManifest.xml
<activity android:name=".MainActivity">
    <intent-filter>
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data android:scheme="xdcapp" />
    </intent-filter>
</activity>

// MainActivity.kt
override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    
    intent?.data?.let { uri ->
        if (uri.scheme == "xdcapp") {
            handleDeepLink(uri)
        }
    }
}
```

## React Native Integration

```javascript
import { WalletConnectModal } from '@walletconnect/modal-react-native';

const providerMetadata = {
  name: 'XDC dApp',
  description: 'XDC dApp Integration',
  url: 'https://yourapp.com',
  icons: ['https://yourapp.com/icon.png'],
  redirect: {
    native: 'xdcapp://',
    universal: 'https://yourapp.com/wallet'
  }
};

const sessionParams = {
  namespaces: {
    eip155: {
      methods: ['eth_sendTransaction', 'eth_sign', 'personal_sign'],
      chains: ['eip155:50', 'eip155:51'], // XDC mainnet and testnet
      events: ['chainChanged', 'accountsChanged']
    }
  }
};

export default function App() {
  return (
    <WalletConnectModal
      projectId="YOUR_PROJECT_ID"
      providerMetadata={providerMetadata}
      sessionParams={sessionParams}
    />
  );
}
```

## Flutter Integration

```dart
import 'package:walletconnect_dart/walletconnect_dart.dart';

class WalletConnectService {
  late WalletConnect connector;
  String? address;
  
  void init() {
    connector = WalletConnect(
      bridge: 'https://bridge.walletconnect.org',
      clientMeta: PeerMeta(
        name: 'XDC dApp',
        description: 'XDC dApp Integration',
        url: 'https://yourapp.com',
        icons: ['https://yourapp.com/icon.png'],
      ),
    );
    
    connector.on('connect', (session) {
      address = session.accounts[0];
    });
  }
  
  Future<void> connect() async {
    if (!connector.connected) {
      await connector.createSession(
        chainId: 50, // XDC mainnet
        onDisplayUri: (uri) => print(uri),
      );
    }
  }
  
  Future<String> sendTransaction(String to, String value) async {
    final tx = Transaction(
      from: address!,
      to: to,
      value: BigInt.parse(value),
      gasPrice: BigInt.parse('0x1bf08eb000'),
      gasLimit: BigInt.parse('0x5208'),
    );
    
    return await connector.sendTransaction(tx);
  }
}
```

## Security Best Practices

| Practice | Description | Implementation |
|----------|-------------|----------------|
| **Secure Storage** | Store keys in Keychain/Keystore | Use `react-native-keychain` |
| **Certificate Pinning** | Prevent MITM attacks | Use `TrustKit` |
| **Biometric Auth** | Require fingerprint/face | Use `LocalAuthentication` |
| **App Attestation** | Verify app integrity | Use `DeviceCheck` / `SafetyNet` |
| **Deep Link Validation** | Validate incoming URLs | Whitelist schemes |

## Testing

| Test Type | Tool | Command |
|-----------|------|---------|
| **iOS Simulator** | Xcode | `Cmd+R` |
| **Android Emulator** | Android Studio | `Run` |
| **Device Testing** | TestFlight / Firebase | Distribute build |
| **Network Testing** | Charles Proxy | Monitor traffic |
| **Security Audit** | OWASP ZAP | Scan vulnerabilities |

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| "Wallet not found" | Wallet not installed | Deep link to app store |
| "Connection timeout" | Network issue | Retry with exponential backoff |
| "Invalid chain" | Wrong chain ID | Use 50 for mainnet, 51 for testnet |
| "Deep link not working" | Scheme not registered | Check Info.plist / AndroidManifest.xml |
| "Transaction failed" | Insufficient gas | Increase gas limit |

## Next Steps

- [Frontend Frameworks →](../frontend/index.md) — React, Vue, Angular
- [Wallet Adapters →](../wallet-adapters/index.md) — Multi-wallet support
