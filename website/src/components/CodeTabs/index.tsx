import {useState} from 'react';
import {Copy, Check} from 'lucide-react';

type SnippetKey = 'hardhat' | 'foundry' | 'curl';

const SNIPPETS: Record<SnippetKey, {tab: string; title: string; code: string}> = {
  hardhat: {
    tab: 'Hardhat',
    title: 'hardhat.config.ts',
    code: `import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  networks: {
    xdc: {
      url: "https://rpc.xinfin.network",
      chainId: 50,
      accounts: [process.env.PRIVATE_KEY!]
    },
    apothem: {
      url: "https://erpc.apothem.network",
      chainId: 51,
      accounts: [process.env.PRIVATE_KEY!]
    }
  }
};

export default config;`,
  },
  foundry: {
    tab: 'Foundry',
    title: 'foundry.toml',
    code: `[profile.default]
src = "src"
out = "out"
libs = ["lib"]
solc_version = "0.8.24"

[rpc_endpoints]
xdc = "https://rpc.xinfin.network"
apothem = "https://erpc.apothem.network"

[etherscan]
xdc = { key = "\${XDCSCAN_API_KEY}" }`,
  },
  curl: {
    tab: 'RPC',
    title: 'rpc-request.sh',
    code: `curl https://rpc.xinfin.network \\
  -X POST \\
  -H "Content-Type: application/json" \\
  --data '{
    "jsonrpc":"2.0",
    "method":"eth_blockNumber",
    "params":[],
    "id":1
  }'`,
  },
};

const ORDER: SnippetKey[] = ['hardhat', 'foundry', 'curl'];

export default function CodeTabs() {
  const [active, setActive] = useState<SnippetKey>('hardhat');
  const [copied, setCopied] = useState(false);
  const snippet = SNIPPETS[active];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(snippet.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div>
      <div className="snippet-tabs" role="tablist">
        {ORDER.map((key) => (
          <button
            key={key}
            role="tab"
            aria-selected={active === key}
            className={
              active === key ? 'snippet-tab snippet-tab--active' : 'snippet-tab'
            }
            onClick={() => setActive(key)}>
            {SNIPPETS[key].tab}
          </button>
        ))}
      </div>
      <div className="code-window">
        <div className="code-window__bar">
          <span className="code-window__filename" data-testid="code-title">
            {snippet.title}
          </span>
          <button type="button" className="code-window__copy" onClick={copy}>
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <pre>
          <code data-testid="code-block">{snippet.code}</code>
        </pre>
      </div>
    </div>
  );
}
