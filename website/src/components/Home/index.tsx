import {useState, useEffect} from 'react';
import Link from '@docusaurus/Link';
import {
  Hammer,
  Flame,
  Plug,
  ArrowUpRight,
} from 'lucide-react';
import styles from './HomeSections.module.css';

const TOOLING_CARDS = [
  {
    icon: Hammer,
    title: 'Hardhat',
    desc: 'Compile, test, and deploy Solidity projects.',
    to: '/docs/smart-contracts/hardhat-guide',
  },
  {
    icon: Flame,
    title: 'Foundry',
    desc: 'Fast Solidity testing and scripting workflows.',
    to: '/docs/smart-contracts/foundry-guide',
  },
  {
    icon: Plug,
    title: 'Web3 libraries',
    desc: 'Use ethers, web3.js, viem, and wallet connectors.',
    to: '/docs/xdc-chain/developers/xdc3js-sdk',
  },
];

const OPERATOR_CHECKLIST = [
  'Provision secure server',
  'Install node binary',
  'Configure monitoring',
  'Back up validator keys',
];

const CHECKLIST_KEY = 'xdc-operator-checklist';

export default function HomeSections() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(CHECKLIST_KEY);
      if (stored) setChecked(JSON.parse(stored) as Record<string, boolean>);
    } catch {
      // ignore
    }
  }, []);

  const toggleItem = (item: string) => {
    setChecked((prev) => {
      const next = {...prev, [item]: !prev[item]};
      try {
        window.localStorage.setItem(CHECKLIST_KEY, JSON.stringify(next));
      } catch {
        // storage may be unavailable
      }
      return next;
    });
  };

  return (
    <>
      <section className="quickstart-section">
        <p className="section-eyebrow">Tooling</p>
        <h2 className="section-heading">SDKs &amp; tooling</h2>
        <div className="quickstart-grid">
          {TOOLING_CARDS.map((card) => (
            <Link key={card.title} className="quickstart-card" to={card.to}>
              <span className="quickstart-card__icon">
                <card.icon size={20} strokeWidth={2} aria-hidden />
              </span>
              <h3 className="quickstart-card__title">{card.title}</h3>
              <p className="quickstart-card__desc">{card.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="quickstart-section">
        <p className="section-eyebrow">Operate</p>
        <h2 className="section-heading">Run a validator</h2>
        <p className="section-sub">
          Step-by-step operational runbooks for provisioning, securing, and
          monitoring validator infrastructure on XDC Network.
        </p>
        <div className="quickstart-card">
          <h3 className="quickstart-card__title">Operator checklist</h3>
          <div className={styles.checklistGrid}>
            {OPERATOR_CHECKLIST.map((item) => (
              <label key={item} className={styles.checklistRow}>
                <input
                  type="checkbox"
                  className={styles.checklistCheckbox}
                  checked={!!checked[item]}
                  onChange={() => toggleItem(item)}
                />
                <span>{item}</span>
              </label>
            ))}
          </div>
        </div>
      </section>

      <section className="quickstart-section">
        <div className={styles.ctaBand}>
          <p className={styles.ctaEyebrow}>Need help?</p>
          <h2 className={styles.ctaHeading}>
            Join builders shipping on XDC Network.
          </h2>
          <p className={styles.ctaSub}>
            Connect with the community, find support channels, and get
            unstuck fast with help from the XDC ecosystem.
          </p>
          <Link
            className="gold-btn"
            to="/docs/community/">
            Explore community <ArrowUpRight size={15} strokeWidth={2.5} />
          </Link>
        </div>
      </section>
    </>
  );
}
