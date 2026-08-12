import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import CodeTabs from '@site/src/components/CodeTabs';
import HomeSections from '@site/src/components/Home';
import {
  ArrowRight,
  Wallet,
  FileCode2,
  HardDrive,
} from 'lucide-react';

const CONFIG_SNIPPET = `export const network = {
  chainId: 50,
  name: "XDC Mainnet",
  rpcUrl: "https://rpc.xinfin.network",
  explorer: "https://xdcscan.com"
}`;

const STATS = [
  {label: 'Consensus', value: 'XDPoS'},
  {label: 'EVM', value: 'Compatible'},
  {label: 'Mainnet ID', value: '50'},
  {label: 'Testnet ID', value: '51'},
];

const QUICKSTART_CARDS = [
  {
    icon: Wallet,
    title: 'Connect a wallet',
    desc: 'Add XDC Mainnet and Apothem Testnet details to your wallet.',
    to: '/docs/xdc-chain/developers/wallet-configuration',
  },
  {
    icon: FileCode2,
    title: 'Deploy contracts',
    desc: 'Use familiar EVM tooling including Hardhat, Foundry, and Remix.',
    to: '/docs/smart-contracts/deployment-verification',
  },
  {
    icon: HardDrive,
    title: 'Run infrastructure',
    desc: 'Operate nodes, monitor health, and participate in consensus.',
    to: '/docs/xdc-chain/developers/node-operators/',
  },
];

export default function Home() {
  return (
    <Layout
      title="XDC Network Documentation"
      description="Developer documentation for XDC Network — deploy smart contracts, configure wallets, run validators, and explore the EVM-compatible XDC blockchain.">
      <main>
        <section className="hero-section">
          <div className="hero-lines" aria-hidden />
          <div className="hero-inner">
            <div>
              <span className="eyebrow-pill">
                Redesigned developer experience
              </span>
              <h1 className="hero-heading">
                Documentation that gets builders from
                <span className="text-stroke">zero to XDC.</span>
              </h1>
              <p className="hero-sub">
                A clean, searchable, task-focused docs interface for deploying
                smart contracts, connecting wallets, reading RPC references,
                and operating validator infrastructure on XDC Network.
              </p>
              <div className="hero-ctas">
                <Link className="gold-btn" to="/docs/learn/">
                  Start building <ArrowRight size={15} strokeWidth={2.5} />
                </Link>
                <Link className="outline-btn" to="/docs/xdc-chain/faq">
                  Read the FAQ
                </Link>
              </div>
            </div>

            <div className="status-panel">
              <div className="status-panel__head">
                <div>
                  <p className="status-panel__title">Network status</p>
                  <p className="status-panel__subtitle">
                    Developer essentials at a glance
                  </p>
                </div>
                <span className="status-badge">Operational</span>
              </div>
              <div className="stat-grid">
                {STATS.map((stat) => (
                  <div key={stat.label} className="stat-card">
                    <p className="stat-card__label">{stat.label}</p>
                    <p className="stat-card__value">{stat.value}</p>
                  </div>
                ))}
              </div>
              <div className="code-window">
                <div className="code-window__bar">
                  <span className="code-window__dot code-window__dot--red" />
                  <span className="code-window__dot code-window__dot--yellow" />
                  <span className="code-window__dot code-window__dot--green" />
                  <span className="code-window__filename">xdc.config.js</span>
                </div>
                <pre>
                  <code>{CONFIG_SNIPPET}</code>
                </pre>
              </div>
            </div>
          </div>
        </section>

        <section className="quickstart-section">
          <div className="quickstart-grid">
            {QUICKSTART_CARDS.map((card) => (
              <Link key={card.title} className="quickstart-card" to={card.to}>
                <span className="quickstart-card__icon">
                  <card.icon size={20} strokeWidth={2} aria-hidden />
                </span>
                <h3 className="quickstart-card__title">{card.title}</h3>
                <p className="quickstart-card__desc">{card.desc}</p>
              </Link>
            ))}
          </div>

          <p className="section-eyebrow">Quickstart</p>
          <h2 className="section-heading">Build your first XDC dApp</h2>
          <p className="section-sub">
            XDC Network is an enterprise-ready, EVM-compatible blockchain
            designed for fast settlement, low fees, and real-world asset
            workflows. Choose a toolchain below and ship.
          </p>
          <CodeTabs />
        </section>

        <HomeSections />
      </main>
    </Layout>
  );
}
