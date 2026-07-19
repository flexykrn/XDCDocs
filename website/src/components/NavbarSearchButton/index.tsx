import {Search} from 'lucide-react';

export default function NavbarSearchButton() {
  return (
    <button
      type="button"
      className="xdc-search-btn"
      aria-label="Search documentation (coming soon)"
      title="Search is wired up in a later phase">
      <span className="xdc-search-btn__label">
        <Search size={15} strokeWidth={2.2} />
        <span>Search docs, RPC, tooling...</span>
      </span>
      <span className="xdc-search-btn__kbd">⌘ K</span>
    </button>
  );
}
