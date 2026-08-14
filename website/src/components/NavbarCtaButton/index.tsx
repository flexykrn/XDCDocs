import {Sparkles} from 'lucide-react';

export default function NavbarCtaButton() {
  const openChat = () => {
    // Dispatches a custom event that ChatWidget listens for
    document.dispatchEvent(new CustomEvent('xdc:open-chat'));
  };
  return (
    <button
      type="button"
      className="xdc-cta-btn"
      onClick={openChat}
      aria-label="Open AI documentation assistant">
      <Sparkles size={14} strokeWidth={2.5} />
      Ask AI
    </button>
  );
}

