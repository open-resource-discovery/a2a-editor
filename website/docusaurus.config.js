// @ts-check

require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const baseUrl = process.env.BASE_URL || "/";

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: "A2A Editor",
  tagline:
    "Analyze, validate, and interact with Agent-to-Agent (A2A) protocol agent cards. Connect to agents, inspect their capabilities, and test communication in real-time.",
  favicon: "img/a2a-icon.svg",

  url: process.env.SITE_URL || "https://open-resource-discovery.github.io",
  baseUrl,

  customFields: {
    predefinedAgents: process.env.VITE_PREDEFINED_AGENTS || "[]",
  },

  organizationName: "ORD",
  projectName: "a2a-editor",

  onBrokenLinks: "throw",

  markdown: {
    hooks: {
      onBrokenMarkdownLinks: "warn",
    },
  },

  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  headTags: [
    {
      tagName: "script",
      attributes: {},
      innerHTML: `window.bannerServerBaseUrl = ${JSON.stringify(process.env.BANNER_SERVER_BASE_URL || "")};`,
    },
  ],

  scripts: [`${baseUrl}js/custom.js`],

  presets: [
    [
      "classic",
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: "./sidebars.js",
          editUrl: "https://github.com/open-resource-discovery/a2a-editor/tree/main/website/",
        },
        blog: false,
        theme: {
          customCss: "./src/css/custom.scss",
        },
      }),
    ],
  ],

  themes: ["@easyops-cn/docusaurus-search-local"],

  plugins: ["docusaurus-plugin-sass"],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      image: "img/social-card.png",
      colorMode: {
        defaultMode: "dark",
        disableSwitch: false,
        respectPrefersColorScheme: false,
      },
      navbar: {
        title: "A2A Editor",
        logo: {
          alt: "A2A Editor Logo",
          src: "img/a2a-light.svg",
          srcDark: "img/a2a-dark.svg",
          width: 32,
          height: 32,
        },
        items: [
          {
            type: "doc",
            docId: "getting-started",
            position: "left",
            label: "Documentation",
          },
          {
            to: "/playground",
            position: "left",
            label: "Playground",
          },
          {
            href: "https://github.com/open-resource-discovery/a2a-editor",
            label: "GitHub",
            position: "right",
            className: "header-github-pill",
          },
        ],
      },
      footer: {},
      prism: {
        theme: require("prism-react-renderer").themes.github,
        darkTheme: require("prism-react-renderer").themes.dracula,
      },
      // Announcement bar configuration
      ...(process.env.PR_PREVIEW_NUMBER
        ? {
            announcementBar: {
              id: "pr-preview-banner",
              content: `<b>This is a preview version of the website for <a href="https://github.com/open-resource-discovery/a2a-editor/pull/${process.env.PR_PREVIEW_NUMBER}" target="_blank">PR #${process.env.PR_PREVIEW_NUMBER}</a></b>`,
              backgroundColor: "#e65050",
              textColor: "#fff",
              isCloseable: false,
            },
          }
        : process.env.NODE_ENV === "production" && process.env.BANNER_SERVER_BASE_URL
          ? {
              announcementBar: {
                id: "internal-banner",
                backgroundColor: "#ffe900",
                textColor: "#000000",
                content: '<div class="internal-banner-hidden"></div>',
                isCloseable: false,
              },
            }
          : {}),
    }),
};

module.exports = config;
