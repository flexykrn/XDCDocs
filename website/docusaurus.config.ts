import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import {prismXdcLight, prismXdcDark} from './src/theme/prismXdc';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const redirects: {from: string | string[]; to: string}[] = require('./redirects.js');

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

  plugins: [
    [
      '@docusaurus/plugin-client-redirects',
      {
        redirects,
      },
    ],
    [
      '@easyops-cn/docusaurus-search-local',
      {
        hashed: true,
        language: ['en'],
        docsRouteBasePath: '/docs',
        highlightSearchTermsOnTargetPage: true,
      },
    ],
  ],

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
    mermaid: {
      theme: {light: 'base', dark: 'base'},
      options: {
        theme: 'base',
        themeVariables: {
          primaryColor: '#dbe4ff',
          primaryBorderColor: '#2b5ce6',
          primaryTextColor: '#0f1b33',
          lineColor: '#5b8def',
          secondaryColor: '#eef2ff',
          tertiaryColor: '#101a30',
          tertiaryTextColor: '#dbe4ff',
          fontFamily: 'Inter',
        },
      },
    },
    prism: {
      theme: prismXdcLight,
      darkTheme: prismXdcDark,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
