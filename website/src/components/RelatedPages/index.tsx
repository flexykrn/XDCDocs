import Link from '@docusaurus/Link';
import {useLocation} from '@docusaurus/router';
import styles from './styles.module.css';

export interface RelatedPageLink {
  label: string;
  description?: string;
  to: string;
}

const RELATED_BY_SECTION: Record<string, RelatedPageLink[]> = {
  '/docs/learn': [
    {label: 'XDC Chain FAQ', description: 'Common questions about wallets, gas, and deployment.', to: '/docs/xdc-chain/faq'},
    {label: 'Smart Contracts', description: 'Deploy and verify contracts on XDC.', to: '/docs/smart-contracts/'},
    {label: 'API Reference', description: 'JSON-RPC and WebSocket endpoints.', to: '/docs/api-reference/'},
  ],
  '/docs/xdc-chain': [
    {label: 'Learn XDC', description: 'Blockchain basics and XDC architecture.', to: '/docs/learn/'},
    {label: 'Smart Contracts', description: 'Deploy and verify contracts on XDC.', to: '/docs/smart-contracts/'},
    {label: 'JSON-RPC Reference', description: 'Complete method documentation.', to: '/docs/api-reference/json-rpc'},
  ],
  '/docs/subnet': [
    {label: 'Private Subnets', description: 'Enterprise privacy on XDC.', to: '/docs/enterprise/private-subnets'},
    {label: 'XDC Architecture', description: 'How the parent chain is designed.', to: '/docs/learn/xdc-architecture'},
    {label: 'XDC Chain FAQ', description: 'Common questions about the mainnet.', to: '/docs/xdc-chain/faq'},
  ],
  '/docs/enterprise': [
    {label: 'XDC Subnet', description: 'Private chains anchored to XDC mainnet.', to: '/docs/subnet/overview'},
    {label: 'Learn XDC', description: 'Blockchain basics and XDC architecture.', to: '/docs/learn/'},
    {label: 'Ecosystem', description: 'Projects and tools in the XDC ecosystem.', to: '/docs/ecosystem/'},
  ],
  '/docs/api-reference': [
    {label: 'RPC Overview', description: 'Connect to XDC nodes and endpoints.', to: '/docs/xdc-chain/developers/rpc'},
    {label: 'Smart Contracts', description: 'Deploy and verify contracts on XDC.', to: '/docs/smart-contracts/'},
    {label: 'Gas & Fees', description: 'How transaction costs work on XDC.', to: '/docs/learn/gas-fees'},
  ],
  '/docs/smart-contracts': [
    {label: 'Gas & Fees', description: 'Estimate and optimize transaction costs.', to: '/docs/learn/gas-fees'},
    {label: 'JSON-RPC Reference', description: 'Complete method documentation.', to: '/docs/api-reference/json-rpc'},
    {label: 'XDC Chain FAQ', description: 'Common questions about deployment.', to: '/docs/xdc-chain/faq'},
  ],
  '/docs/ecosystem': [
    {label: 'Learn XDC', description: 'Blockchain basics and XDC architecture.', to: '/docs/learn/'},
    {label: 'Enterprise', description: 'XDC for business and institutions.', to: '/docs/enterprise/'},
    {label: 'Token Standards', description: 'XRC20, XRC721, and more.', to: '/docs/smart-contracts/tokens'},
  ],
};

function deriveLinks(pathname: string): RelatedPageLink[] | null {
  for (const [prefix, links] of Object.entries(RELATED_BY_SECTION)) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return links;
    }
  }
  return null;
}

export default function RelatedPages({links}: {links?: RelatedPageLink[]}) {
  const {pathname} = useLocation();
  const items = links ?? deriveLinks(pathname);

  if (!items || items.length === 0) {
    return null;
  }

  return (
    <section className={styles.section} aria-label="Related pages">
      <h2 className={styles.heading}>Related pages</h2>
      <div className={styles.grid}>
        {items.map((item) => (
          <Link key={item.to} to={item.to} className={styles.card}>
            <span className={styles.cardLabel}>{item.label}</span>
            {item.description && <span className={styles.cardDesc}>{item.description}</span>}
          </Link>
        ))}
      </div>
    </section>
  );
}
