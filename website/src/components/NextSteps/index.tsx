import Link from '@docusaurus/Link';
import {ArrowRight} from 'lucide-react';

import styles from './styles.module.css';

export interface NextStepsLink {
  label: string;
  to: string;
}

interface NextStepsProps {
  links?: NextStepsLink[];
}

const defaultLinks: NextStepsLink[] = [
  {label: 'Back to docs home', to: '/docs/learn/'},
];

export default function NextSteps({links = defaultLinks}: NextStepsProps) {
  return (
    <nav className={styles.wrapper} aria-label="Next steps">
      <h2 className={styles.heading}>Next steps</h2>
      <div className={styles.row}>
        {links.map((link) => (
          <Link key={link.to} to={link.to} className={styles.card}>
            <span className={styles.label}>{link.label}</span>
            <ArrowRight size={18} className={styles.arrow} />
          </Link>
        ))}
      </div>
    </nav>
  );
}
