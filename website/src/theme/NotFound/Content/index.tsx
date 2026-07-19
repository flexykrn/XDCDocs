import Link from '@docusaurus/Link';
import styles from './styles.module.css';

export default function NotFoundContent() {
  return (
    <main className={styles.notFound}>
      <p className={styles.eyebrow}>404</p>
      <h1 className={styles.heading}>Lost?</h1>
      <p className={styles.sub}>
        This page doesn't exist — it may have moved in the migration.
      </p>
      <div className={styles.actions}>
        <Link className="gold-btn" to="/docs/learn/">
          Go to docs
        </Link>
        <Link className="outline-btn" to="/">
          Back home
        </Link>
      </div>
    </main>
  );
}
