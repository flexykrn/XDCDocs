import {useState} from 'react';
import {ThumbsUp, ThumbsDown} from 'lucide-react';
import styles from './styles.module.css';

type Vote = 'up' | 'down' | null;

export default function FeedbackWidget() {
  const [vote, setVote] = useState<Vote>(null);

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
            onClick={() => setVote('up')}>
            <ThumbsUp size={16} />
          </button>
          <button
            type="button"
            className={`${styles.btn} ${vote === 'down' ? styles.active : ''}`}
            aria-label="No, this page was not helpful"
            aria-pressed={vote === 'down'}
            onClick={() => setVote('down')}>
            <ThumbsDown size={16} />
          </button>
        </div>
      </div>
      {vote && <p className={styles.thanks}>Thanks for the feedback.</p>}
    </div>
  );
}
