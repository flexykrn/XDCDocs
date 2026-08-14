import {useCallback, useEffect, useRef, useState} from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {useLocation} from '@docusaurus/router';
import {MessageCircle, X, Send, ThumbsUp, ThumbsDown, Trash2, Sparkles} from 'lucide-react';
import styles from './styles.module.css';

type Role = 'user' | 'assistant';

interface Source {
  title: string;
  url: string;
}

interface Message {
  role: Role;
  content: string;
  sources?: Source[];
  vote?: 'up' | 'down' | null;
  error?: boolean;
}

const HISTORY_KEY = 'xdc-chat-history';
const HISTORY_CAP = 50;

const SUGGESTED_PROMPTS = [
  'How do I deploy a smart contract on XDC?',
  'What are XDC gas fees?',
  'How do I add XDC to MetaMask?',
  'What is XDPoS consensus?',
];

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderMarkdown(markdown: string): string {
  const escaped = escapeHtml(markdown);
  const codeBlocks: string[] = [];

  let html = escaped.replace(/```(?:\w*)\n?([\s\S]*?)```/g, (_match, code: string) => {
    codeBlocks.push(`<pre><code>${code.replace(/\n$/, '')}</code></pre>`);
    return `\u0010CB${codeBlocks.length - 1}\u0010`;
  });

  html = html
    .replace(/`([^`\n]+)`/g, '<code>$1</code>')
    .replace(
      /\[([^\]]+)\]\(([^)\s]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener">$1</a>',
    )
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*\n]+)\*/g, '<em>$1</em>');

  // Convert list items before paragraph wrapping
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>[\s\S]+?<\/li>)/g, '<ul>$1</ul>');

  html = html
    .split(/\n{2,}/)
    .map((block) =>
      block.startsWith('\u0010CB') || block.startsWith('<ul>') || block.startsWith('<li>')
        ? block
        : `<p>${block.replace(/\n/g, '<br/>')}</p>`,
    )
    .join('');

  html = html.replace(/\u0010CB(\d+)\u0010/g, (match, i: string) => {
    const block = codeBlocks[Number(i)];
    return block !== undefined ? block : match;
  });

  return html;
}

export default function ChatWidget() {
  const {siteConfig} = useDocusaurusContext();
  const ragApiUrl = (siteConfig.customFields?.ragApiUrl as string) || 'http://localhost:3001';
  const {pathname} = useLocation();

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);

  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(HISTORY_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Message[];
        if (Array.isArray(parsed)) {
          setMessages(parsed.filter((m) => m && (m.role === 'user' || m.role === 'assistant')));
        }
      }
    } catch {
      // ignore corrupt history
    }
  }, []);

  // Health-check the RAG API on first mount
  useEffect(() => {
    fetch(`${ragApiUrl}/health`, {signal: AbortSignal.timeout(3000)})
      .then((r) => setApiOnline(r.ok))
      .catch(() => setApiOnline(false));
  }, [ragApiUrl]);

  // Keyboard shortcut: Ctrl+I / Cmd+I to toggle chat
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Listen for navbar 'Ask AI' button event
  useEffect(() => {
    const handler = () => setOpen(true);
    document.addEventListener('xdc:open-chat', handler);
    return () => document.removeEventListener('xdc:open-chat', handler);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(HISTORY_KEY, JSON.stringify(messages.slice(-HISTORY_CAP)));
    } catch {
      // storage may be unavailable
    }
  }, [messages]);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    const el = listRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, loading, open]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      const history = messages.map(({role, content}) => ({role, content}));
      const nextMessages: Message[] = [...messages, {role: 'user', content: trimmed}];
      setMessages(nextMessages);
      setInput('');
      setLoading(true);

      try {
        const res = await fetch(`${ragApiUrl}/api/chat`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({message: trimmed, history}),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('text/event-stream') && res.body) {
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let answer = '';
          let sources: Source[] = [];
          let buffer = '';
          setMessages([...nextMessages, {role: 'assistant', content: '', sources: [], vote: null}]);
          for (;;) {
            const {done, value} = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, {stream: true});
            const events = buffer.split('\n\n');
            buffer = events.pop() || '';
            for (const evt of events) {
              const line = evt.split('\n').find((l) => l.startsWith('data:'));
              if (!line) continue;
              try {
                const payload = JSON.parse(line.slice(5).trim());
                if (payload.type === 'sources' && Array.isArray(payload.sources)) {
                  sources = payload.sources;
                } else if (payload.type === 'chunk' && typeof payload.content === 'string') {
                  answer += payload.content;
                  const current = answer;
                  setMessages([...nextMessages, {role: 'assistant', content: current, sources, vote: null}]);
                }
              } catch {
                // ignore malformed SSE lines
              }
            }
          }
          setMessages([...nextMessages, {role: 'assistant', content: answer, sources, vote: null}]);
        } else {
          const data = (await res.json()) as {answer: string; sources?: Source[]};
          setMessages([
            ...nextMessages,
            {role: 'assistant', content: data.answer, sources: data.sources ?? [], vote: null},
          ]);
        }
      } catch {
        setMessages([
          ...nextMessages,
          {
            role: 'assistant',
            content: 'The assistant is offline right now. Try again in a bit — or browse the sections above.',
            vote: null,
            error: true,
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [loading, messages, ragApiUrl],
  );

  const handleVote = (index: number, vote: 'up' | 'down') => {
    setMessages((prev) => {
      const next = [...prev];
      const msg = next[index];
      if (!msg || msg.role !== 'assistant') return prev;
      if (msg.vote === vote) {
        next[index] = {...msg, vote: null};
        return next;
      }
      next[index] = {...msg, vote};
      fetch(`${ragApiUrl}/api/feedback`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          vote,
          page: pathname,
          answerExcerpt: msg.content.slice(0, 120),
        }),
      }).catch(() => {
        // feedback is best-effort
      });
      return next;
    });
  };

  const clearChat = () => {
    setMessages([]);
    try {
      window.localStorage.removeItem(HISTORY_KEY);
    } catch {
      // storage may be unavailable
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send(input);
    }
  };

  return (
    <>
      <button
        type="button"
        className={styles.fab}
        aria-label={open ? 'Close chat' : 'Open chat assistant (Ctrl+I)'}
        aria-expanded={open}
        title="Ask AI (Ctrl+I)"
        onClick={() => setOpen((v) => !v)}>
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>

      {open && (
        <div className={styles.panel} role="dialog" aria-label="XDC Docs Assistant">
          <div className={styles.header}>
            <div className={styles.headerIdentity}>
              <span className={styles.avatar}>
                <Sparkles size={16} />
              </span>
              <span className={styles.headerText}>
                <span className={styles.title}>XDC Docs Assistant</span>
                <span className={styles.subtitle}>
                  {apiOnline === false
                    ? '⚠️ Chat offline — RAG service unavailable'
                    : 'AI answers from the docs, with sources'}
                </span>
              </span>
            </div>
            <div className={styles.headerActions}>
              <button
                type="button"
                className={styles.iconBtn}
                aria-label="Clear chat"
                title="Clear chat"
                onClick={clearChat}>
                <Trash2 size={16} />
              </button>
              <button
                type="button"
                className={styles.iconBtn}
                aria-label="Close chat"
                onClick={() => setOpen(false)}>
                <X size={16} />
              </button>
            </div>
          </div>

          <div className={styles.messages} role="log" aria-live="polite" ref={listRef}>
            {messages.length === 0 && !loading && (
              <div className={styles.suggestions}>
                <p className={styles.suggestionsLabel}>Ask me anything about XDC:</p>
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    className={styles.chip}
                    onClick={() => void send(prompt)}>
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`${styles.row} ${msg.role === 'user' ? styles.rowUser : styles.rowAssistant}`}>
                {msg.role === 'assistant' && (
                  <span className={styles.rowAvatar} aria-hidden>
                    <Sparkles size={12} />
                  </span>
                )}
                <div
                  className={`${styles.bubble} ${
                    msg.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant
                  } ${msg.error ? styles.bubbleError : ''}`}>
                  {msg.role === 'assistant' ? (
                    <div
                      className={styles.markdown}
                      dangerouslySetInnerHTML={{__html: renderMarkdown(msg.content)}}
                    />
                  ) : (
                    msg.content
                  )}

                  {msg.role === 'assistant' && !msg.error && (
                    <>
                      {msg.sources && msg.sources.length > 0 && (
                        <div className={styles.sources}>
                          {msg.sources.map((src) => (
                            <a
                              key={src.url}
                              href={src.url}
                              target="_blank"
                              rel="noopener"
                              className={styles.sourceChip}>
                              {src.title}
                            </a>
                          ))}
                        </div>
                      )}
                      <div className={styles.votes}>
                        <button
                          type="button"
                          className={`${styles.voteBtn} ${msg.vote === 'up' ? styles.voteActive : ''}`}
                          aria-label="Helpful answer"
                          aria-pressed={msg.vote === 'up'}
                          onClick={() => handleVote(i, 'up')}>
                          <ThumbsUp size={14} />
                        </button>
                        <button
                          type="button"
                          className={`${styles.voteBtn} ${msg.vote === 'down' ? styles.voteActive : ''}`}
                          aria-label="Unhelpful answer"
                          aria-pressed={msg.vote === 'down'}
                          onClick={() => handleVote(i, 'down')}>
                          <ThumbsDown size={14} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className={`${styles.row} ${styles.rowAssistant}`}>
                <span className={styles.rowAvatar} aria-hidden>
                  <Sparkles size={12} />
                </span>
                <div className={`${styles.bubble} ${styles.bubbleAssistant} ${styles.thinking}`}>
                  <span className={styles.dot} />
                  <span className={styles.dot} />
                  <span className={styles.dot} />
                </div>
              </div>
            )}
          </div>

          <div className={styles.inputRow}>
            <textarea
              ref={inputRef}
              className={styles.input}
              aria-label="Message the assistant"
              placeholder="Ask a question&hellip;"
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
            />
            <button
              type="button"
              className={styles.sendBtn}
              aria-label="Send message"
              disabled={loading || !input.trim()}
              onClick={() => void send(input)}>
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
