import {useCallback, useEffect, useRef, useState} from 'react';
import {Copy, Check} from 'lucide-react';
import styles from './styles.module.css';

const TITLE_SUFFIX = ' | XDC Network Documentation';

export default function CopyMarkdown() {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleCopy = useCallback(async () => {
    const article = document.querySelector('article');
    if (!article) return;

    const title = document.title.endsWith(TITLE_SUFFIX)
      ? document.title.slice(0, -TITLE_SUFFIX.length)
      : document.title;
    const sourceUrl = window.location.href;
    const text = `# ${title}\n\nSource: ${sourceUrl}\n\n${article.innerText.trim()}\n`;

    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
      } catch {
        // clipboard unavailable
      }
      document.body.removeChild(textarea);
    }

    setCopied(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopied(false), 2000);
  }, []);

  return (
    <div className={styles.wrapper}>
      <button
        type="button"
        className={styles.btn}
        onClick={() => void handleCopy()}
        aria-live="polite">
        {copied ? <Check size={14} /> : <Copy size={14} />}
        <span>{copied ? 'Copied!' : 'Copy page'}</span>
      </button>
    </div>
  );
}
