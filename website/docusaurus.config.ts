import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'XDC Network Documentation',
  tagline: 'Get started with XDC Chain Docs. Explore the documentation for XDC Chain',
  favicon: 'img/xdc.svg',

  future: {
    v4: true,
  },

  url: 'https://xinfin.org',
  baseUrl: '/',

  organizationName: 'XinFinOrg',
  projectName: 'Docs',

  onBrokenLinks: 'throw',

  markdown: {
    mermaid: true,
  },

  themes: ['@docusaurus/theme-mermaid'],

  stylesheets: [
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&display=swap',
  ],

  headTags: [
    {
      tagName: 'link',
      attributes: {rel: 'preconnect', href: 'https://fonts.googleapis.com'},
    },
    {
      tagName: 'link',
      attributes: {rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: 'anonymous'},
    },
  ],

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/XinFinOrg/Docs/edit/main/website/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/xdc.svg',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      logo: {
        alt: 'XDC Network Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          type: 'custom-searchButton',
          position: 'left',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Explore',
          items: [
            {label: 'Official Website', href: 'https://xinfin.org/'},
            {label: 'Get XDC', href: 'https://xinfin.org/get-xdc'},
            {label: 'XDC Wallets', href: 'https://xinfin.org/wallets'},
            {label: 'XDC Subnet', href: 'https://xinfin.org/xdc-subnet'},
          ],
        },
        {
          title: 'Community',
          items: [
            {label: 'Dev Ecosystem Partners', href: 'https://xinfin.org/developers-ecosystem-partners'},
            {label: 'Join Community', href: 'https://xinfin.org/join-community'},
            {label: 'Events', href: 'https://xinfin.org/events'},
            {label: 'Community Bounty', href: 'https://xinfin.org/community-bounty'},
          ],
        },
        {
          title: 'Other Links',
          items: [
            {label: 'Contact Us', href: 'https://xinfin.org/join-community'},
            {label: 'GitHub', href: 'https://github.com/XinFinOrg/Docs'},
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} XDC Network. All rights reserved.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
