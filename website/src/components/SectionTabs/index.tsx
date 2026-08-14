import Link from '@docusaurus/Link';
import {useLocation} from '@docusaurus/router';

const SECTIONS = [
  {label: 'Learn', to: '/docs/learn/', match: '/docs/learn'},
  {label: 'XDC Chain', to: '/docs/xdc-chain/', match: '/docs/xdc-chain'},
  {label: 'XDC Subnet', to: '/docs/subnet/overview', match: '/docs/subnet'},
  {label: 'Enterprise', to: '/docs/enterprise/', match: '/docs/enterprise'},
  {label: 'API Reference', to: '/docs/api-reference/', match: '/docs/api-reference'},
  {label: 'Smart Contracts', to: '/docs/smart-contracts/', match: '/docs/smart-contracts'},
  {label: 'Ecosystem', to: '/docs/ecosystem/', match: '/docs/ecosystem'},
  {label: 'Announcements', to: '/docs/announcements/', match: '/docs/announcements'},
];

export default function SectionTabs() {
  const {pathname} = useLocation();
  return (
    <nav className="section-tabs" aria-label="Documentation sections">
      <div className="section-tabs__inner">
        {SECTIONS.map((s) => {
          const active = pathname.startsWith(s.match);
          return (
            <Link
              key={s.label}
              to={s.to}
              className={
                active ? 'section-tabs__tab section-tabs__tab--active' : 'section-tabs__tab'
              }
              aria-current={active ? 'page' : undefined}>
              {s.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
