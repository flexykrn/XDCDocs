import {useState} from 'react';
import CodeBlock from '@theme/CodeBlock';

type SnippetKey = 'hardhat' | 'foundry' | 'curl';

const SNIPPETS: Record<SnippetKey, {tab: string; title: string; language: string; code: string}> = {
  hardhat: {
    tab: 'Hardhat',
    title: 'hardhat.config.ts',
    language: 'typescript',
    code: `import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.28",
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
    language: 'toml',
    code: `[profile.default]
src = "src"
out = "out"
libs = ["lib"]
solc_version = "0.8.28"

[rpc_endpoints]
xdc = "https://rpc.xinfin.network"
apothem = "https://erpc.apothem.network"

[etherscan]
xdc = { key = "\${XDCSCAN_API_KEY}" }`,
  },
  curl: {
    tab: 'RPC',
    title: 'rpc-request.sh',
    language: 'bash',
    code: `curl https://rpc.xinfin.network \
  -X POST \
  -H "Content-Type: application/json" \
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
  const snippet = SNIPPETS[active];

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
      <CodeBlock
        language={snippet.language}
        title={snippet.title}
        showLineNumbers>
        {snippet.code}
      </CodeBlock>
    </div>
  );
}
