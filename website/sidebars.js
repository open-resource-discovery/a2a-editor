/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  docs: [
    "getting-started",
    {
      type: "category",
      label: "Components",
      items: [
        "components/agent-playground",
        "components/agent-playground-lite",
        "components/agent-editor",
        "components/agent-card-view",
        "components/agent-viewer",
      ],
    },
    {
      type: "category",
      label: "API Reference",
      items: ["api/stores", "api/hooks", "api/types"],
    },
    "customization",
  ],
};

module.exports = sidebars;
