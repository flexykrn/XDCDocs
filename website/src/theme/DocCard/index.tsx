import React, {type ReactNode} from 'react';
import {
  useDocById,
  findFirstSidebarItemLink,
} from '@docusaurus/plugin-content-docs/client';
import {
  extractLeadingEmoji,
  useDocCardDescriptionCategoryItemsPlural,
} from '@docusaurus/theme-common/internal';
import isInternalUrl from '@docusaurus/isInternalUrl';
import Layout from '@theme/DocCard/Layout';
import {
  GraduationCap,
  Zap,
  Code2,
  Server,
  HardDrive,
  Landmark,
  CircleHelp,
  Network,
  Boxes,
  Rocket,
  MousePointerClick,
  Library,
  History,
  Building2,
  Braces,
  FileCode2,
  Wallet,
  Globe,
  LayoutGrid,
  Megaphone,
  Folder,
  FileText,
  Link2,
  type LucideIcon,
} from 'lucide-react';

import type {Props} from '@theme/DocCard';
import type {
  PropSidebarItemCategory,
  PropSidebarItemLink,
} from '@docusaurus/plugin-content-docs';

const ICON_MAP: [RegExp, LucideIcon][] = [
  [/faq|question/i, CircleHelp],
  [/changelog/i, History],
  [/learn|glossary|basic/i, GraduationCap],
  [/xdc chain/i, Zap],
  [/developer/i, Code2],
  [/rpc|endpoint/i, Server],
  [/node|operator|validator/i, HardDrive],
  [/governance|dao/i, Landmark],
  [/subnet/i, Network],
  [/component/i, Boxes],
  [/deploy|launch|install/i, Rocket],
  [/using|usage|explorer|faucet/i, MousePointerClick],
  [/resource|repo|contact/i, Library],
  [/enterprise|trade|rwa|iso/i, Building2],
  [/api|method|json-rpc|websocket/i, Braces],
  [/smart.?contract|token|xrc/i, FileCode2],
  [/wallet/i, Wallet],
  [/ecosystem/i, Globe],
  [/platform|defi|dapp/i, LayoutGrid],
  [/announce/i, Megaphone],
];

function pickIcon(
  item: PropSidebarItemLink | PropSidebarItemCategory,
): LucideIcon {
  const haystack = `${item.label} ${item.href}`;
  for (const [pattern, icon] of ICON_MAP) {
    if (pattern.test(haystack)) {
      return icon;
    }
  }
  if (item.type === 'category') {
    return Folder;
  }
  return isInternalUrl(item.href) ? FileText : Link2;
}

function getIconTitleProps(
  item: PropSidebarItemLink | PropSidebarItemCategory,
): {icon: ReactNode; title: string} {
  const extracted = extractLeadingEmoji(item.label);
  const IconComponent = pickIcon(item);
  return {
    icon: <IconComponent size={20} strokeWidth={2} aria-hidden />,
    title: extracted.rest.trim(),
  };
}

function CardCategory({item}: {item: PropSidebarItemCategory}): ReactNode {
  const href = findFirstSidebarItemLink(item);
  const categoryItemsPlural = useDocCardDescriptionCategoryItemsPlural();

  // Unexpected: categories that don't have a link have been filtered upfront
  if (!href) {
    return null;
  }
  return (
    <Layout
      item={item}
      className={item.className}
      href={href}
      description={item.description ?? categoryItemsPlural(item.items.length)}
      {...getIconTitleProps(item)}
    />
  );
}

function CardLink({item}: {item: PropSidebarItemLink}): ReactNode {
  const doc = useDocById(item.docId ?? undefined);
  return (
    <Layout
      item={item}
      className={item.className}
      href={item.href}
      description={item.description ?? doc?.description}
      {...getIconTitleProps(item)}
    />
  );
}

export default function DocCard({item}: Props): ReactNode {
  switch (item.type) {
    case 'link':
      return <CardLink item={item} />;
    case 'category':
      return <CardCategory item={item} />;
    default:
      throw new Error(`unknown item type ${JSON.stringify(item)}`);
  }
}
