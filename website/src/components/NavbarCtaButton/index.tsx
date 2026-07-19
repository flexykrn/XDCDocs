import {ArrowUpRight} from 'lucide-react';

export default function NavbarCtaButton() {
  return (
    <a
      href="https://xinfin.org/"
      target="_blank"
      rel="noopener noreferrer"
      className="xdc-cta-btn">
      Launch App <ArrowUpRight size={15} strokeWidth={2.5} />
    </a>
  );
}
