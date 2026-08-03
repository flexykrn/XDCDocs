import {useEffect, useState} from 'react';
import {useLocation} from '@docusaurus/router';
import {ThumbsUp, ThumbsDown} from 'lucide-react';
import styles from './styles.module.css';

type Vote = 'up' | 'down' | null;

export default function FeedbackWidget() {
  const {pathname} = useLocation();
  const storageKey = `xdc-feedback:${pathname}`;
  const [vote, setVote] = useState<Vote>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);
    setVote(stored === 'up' || stored === 'down' ? stored : null);
  }, [storageKey]);

  const handleVote = (next: 'up' | 'down') => {
    const value: Vote = vote === next ? null : next;
    setVote(value);
    if (value) {
      window.localStorage.setItem(storageKey, value);
    } else {
      window.localStorage.removeItem(storageKey);
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.row}>
        <span className={styles.label}>Was this helpful?</span>
        <div className={styles.buttons}>
          <button
            type="button"
            className={`${styles.btn} ${vote === 'up' ? styles.active : ''}`}
            aria-label="Yes, this page was helpful"
            aria-pressed={vote === 'up'}
            onClick={() => handleVote('up')}>
            <ThumbsUp size={16} />
          </button>
          <button
            type="button"
            className={`${styles.btn} ${vote === 'down' ? styles.active : ''}`}
            aria-label="No, this page was not helpful"
            aria-pressed={vote === 'down'}
            onClick={() => handleVote('down')}>
            <ThumbsDown size={16} />
          </button>
        </div>
      </div>
      {vote && <p className={styles.thanks}>Thanks for the feedback.</p>}
    </div>
  );
}
