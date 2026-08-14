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
    to: '/docs/xdc-chain/developers/node-operators/masternode',
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

            <div className="hero-visual" aria-hidden>
              {/* Animated validator ring */}
              <div className="validator-ring-wrap">
                <svg
                  className="validator-ring"
                  viewBox="0 0 320 320"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg">
                  {/* Outer orbit ring */}
                  <circle cx="160" cy="160" r="140" className="ring-orbit" />
                  <circle cx="160" cy="160" r="100" className="ring-orbit ring-orbit--mid" />

                  {/* 108 validator nodes arranged in outer ring */}
                  {Array.from({length: 36}, (_, i) => {
                    const angle = (i * 360) / 36;
                    const rad = (angle * Math.PI) / 180;
                    const x = 160 + 140 * Math.cos(rad);
                    const y = 160 + 140 * Math.sin(rad);
                    return (
                      <circle
                        key={i}
                        cx={x}
                        cy={y}
                        r="4"
                        className="validator-node"
                        style={{animationDelay: `${(i * 0.09).toFixed(2)}s`}}
                      />
                    );
                  })}

                  {/* Inner ring nodes */}
                  {Array.from({length: 18}, (_, i) => {
                    const angle = (i * 360) / 18;
                    const rad = (angle * Math.PI) / 180;
                    const x = 160 + 100 * Math.cos(rad);
                    const y = 160 + 100 * Math.sin(rad);
                    return (
                      <circle
                        key={`inner-${i}`}
                        cx={x}
                        cy={y}
                        r="3"
                        className="validator-node validator-node--inner"
                        style={{animationDelay: `${(i * 0.15 + 0.5).toFixed(2)}s`}}
                      />
                    );
                  })}

                  {/* Animated consensus sweep line */}
                  <line
                    x1="160" y1="160"
                    x2="300" y2="160"
                    className="consensus-sweep"
                  />

                  {/* Center XDC glow */}
                  <circle cx="160" cy="160" r="38" className="center-glow" />
                  <circle cx="160" cy="160" r="26" className="center-core" />

                  {/* XDC text */}
                  <text
                    x="160" y="155"
                    textAnchor="middle"
                    className="center-label-top">
                    XDC
                  </text>
                  <text
                    x="160" y="170"
                    textAnchor="middle"
                    className="center-label-sub">
                    Network
                  </text>
                </svg>

                {/* Stat chips floating below the ring */}
                <div className="ring-stats">
                  <div className="ring-stat">
                    <span className="ring-stat__value">2s</span>
                    <span className="ring-stat__label">Finality</span>
                  </div>
                  <div className="ring-stat ring-stat--accent">
                    <span className="ring-stat__value">2,000+</span>
                    <span className="ring-stat__label">TPS</span>
                  </div>
                  <div className="ring-stat">
                    <span className="ring-stat__value">&lt;$0.001</span>
                    <span className="ring-stat__label">Avg fee</span>
                  </div>
                  <div className="ring-stat">
                    <span className="ring-stat__value">108</span>
                    <span className="ring-stat__label">Validators</span>
                  </div>
                </div>
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
