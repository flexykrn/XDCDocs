import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'XDC Network Documentation',
  tagline: 'Build the future of decentralized finance on XDC Chain',
  favicon: 'img/xdc.svg',
  url: 'https://docs.xdc.network',
  baseUrl: '/',
  organizationName: 'XinFinOrg',
  projectName: 'Docs',
  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',
  markdown: {
    hooks: {
      onBrokenMarkdownImages: 'ignore',
    },
  },
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
          routeBasePath: '/',
        },
        blog: false,
        theme: {
          customCss: [
            './src/css/custom.css',
            './src/css/tailwind.css',
            './src/css/animations.css',
          ],
        },
      } satisfies Preset.Options,
    ],
  ],
  plugins: [
    [
      require.resolve('docusaurus-lunr-search'),
      {
        languages: ['en'],
      },
    ],
  ],
  themeConfig: {
    image: 'img/xdc-social-card.jpg',
    colorMode: {
      defaultMode: 'dark',
      respectPrefersColorScheme: true,
      disableSwitch: false,
    },
    navbar: {
      title: 'XDC Network',
      logo: {
        alt: 'XDC Network Logo',
        src: 'img/logo-dark.svg',
        srcDark: 'img/logo.svg',
      },
      items: [
        {
          type: 'search',
          position: 'right',
        },
      ],
    },
    secondaryNavbar: {
      items: [
        {
          to: '/learn',
          label: 'Learn',
        },
        {
          to: '/xdcchain',
          label: 'XDC Chain',
        },
        {
          to: '/subnet',
          label: 'Subnet',
        },
        {
          to: '/enterprise',
          label: 'Enterprise',
        },
        {
          to: '/api',
          label: 'API',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {label: 'Learn', to: '/learn'},
            {label: 'XDC Chain', to: '/xdcchain'},
            {label: 'Subnet', to: '/subnet'},
            {label: 'Enterprise', to: '/enterprise'},
            {label: 'API Reference', to: '/api'},
          ],
        },
        {
          title: 'Community',
          items: [
            {label: 'Community', to: '/community'},
            {label: 'Dev Ecosystem', to: '/dev-ecosystem'},
            {label: 'Partners', to: '/partners'},
            {label: 'Join Community', to: '/join-community'},
            {label: 'Events', to: '/events'},
            {label: 'Community Bounty', to: '/community-bounty'},
          ],
        },
        {
          title: 'Other Links',
          items: [
            {label: 'Privacy Policy', to: '/privacy-policy'},
            {label: 'Terms of Use', to: '/terms-of-use'},
            {label: 'Contact Us', to: '/contact'},
            {label: 'GitHub', href: 'https://github.com/XinFinOrg'},
            {label: 'XinFin.org', href: 'https://xinfin.org'},
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} XDC Network.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
