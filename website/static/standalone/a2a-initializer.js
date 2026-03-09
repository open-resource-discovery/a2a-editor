/**
 * A2A Playground Initializer
 *
 * This file is meant to be customized for your deployment.
 * Modify the options below to configure the playground.
 *
 * Available options:
 * - el: Target element selector (required)
 * - agentUrl: Agent URL to auto-connect
 * - agentCard: Initial agent card JSON
 * - showChat: Show chat panel (default: false)
 * - showValidation: Show validation panel (default: false)
 * - showSettings: Show settings panel (default: false)
 * - readOnly: Make editor read-only (default: false)
 * - defaultTab: Default active tab ("overview" | "chat" | "validation")
 * - theme: Color theme ("light" | "dark" | "system")
 * - auth: Authentication config { type, credentials }
 * - onReady: Callback when ready
 * - onConnect: Callback on connection
 * - onError: Callback on error
 */

window.addEventListener("DOMContentLoaded", function () {
  window.playground = A2APlayground.init({
    el: "#a2a-playground",

    // Uncomment to auto-connect to an agent:
    // agentUrl: 'https://my-agent.example.com/.well-known/agent.json',

    // Feature toggles
    showChat: true,
    showValidation: false,
    showSettings: true,
    readOnly: false,
    defaultTab: "overview",

    // Theme: 'light', 'dark', or 'system'
    theme: "system",

    // Authentication (uncomment and configure as needed):
    // auth: {
    //   type: 'apiKey',
    //   credentials: {
    //     key: 'your-api-key',
    //     headerName: 'X-API-Key'
    //   }
    // },

    // Callbacks
    onReady: function (instance) {
      console.log("A2A Playground ready!", instance);
    },

    onConnect: function (url, card) {
      console.log("Connected to:", card.name, "at", url);
    },

    onError: function (error) {
      console.error("A2A Playground error:", error);
    },
  });
});
