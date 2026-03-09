import type { AgentCard, Part } from "@lib/types/a2a";
import { isTextPart, isDataPart } from "@lib/types/a2a";
import { v4 as uuidv4 } from "uuid";

export interface MockAgent {
  card: AgentCard;
  handle: (textInput: string, parts: Part[]) => Part[];
}

export const MOCK_URL_PREFIX = "mock://";

export function isMockUrl(url: string): boolean {
  return url.startsWith(MOCK_URL_PREFIX);
}

export function getMockAgentId(url: string): string {
  return url.replace(MOCK_URL_PREFIX, "").replace(/\/$/, "");
}

export const MOCK_AGENTS: Record<string, MockAgent> = {
  echo: {
    card: {
      name: "Echo Agent",
      url: `${MOCK_URL_PREFIX}echo`,
      version: "1.0.0",
      description:
        "A simple echo agent that returns exactly what you send. Useful for testing connectivity and message format.",
      provider: { name: "Agent Card Editor", organization: "Mock" },
      capabilities: { streaming: false, pushNotifications: false },
      skills: [
        {
          id: "echo",
          name: "Echo",
          description: "Echoes back the user message verbatim.",
          tags: ["test", "echo", "debug"],
          examples: ["Hello, world!", "Test message"],
        },
        {
          id: "reverse",
          name: "Reverse",
          description: "Reverses the characters in your message.",
          tags: ["test", "transform"],
          examples: ["reverse: Hello", "reverse: Testing 123"],
        },
        {
          id: "uppercase",
          name: "Uppercase",
          description: "Converts your message to uppercase.",
          tags: ["test", "transform"],
          examples: ["uppercase: hello world"],
        },
      ],
      defaultInputModes: ["text/plain"],
      defaultOutputModes: ["text/plain"],
      protocolVersions: ["0.3"],
    },
    handle: (text) => {
      const lower = text.toLowerCase();
      if (lower.startsWith("reverse:")) {
        const content = text.slice(8).trim();
        return [{ text: `Reversed: ${content.split("").reverse().join("")}` }];
      }
      if (lower.startsWith("uppercase:")) {
        const content = text.slice(10).trim();
        return [{ text: `Uppercase: ${content.toUpperCase()}` }];
      }
      return [{ text: `Echo: ${text}` }];
    },
  },

  weather: {
    card: {
      name: "Weather Agent",
      url: `${MOCK_URL_PREFIX}weather`,
      version: "1.0.0",
      description: "Returns mock weather information for any city. Data is simulated for testing purposes.",
      provider: { name: "Agent Card Editor", organization: "Mock" },
      capabilities: { streaming: false, pushNotifications: false },
      skills: [
        {
          id: "get-weather",
          name: "Get Weather",
          description: "Returns current weather conditions for a given city.",
          tags: ["weather", "forecast"],
          examples: ["What is the weather in Berlin?", "Temperature in Tokyo"],
        },
        {
          id: "get-forecast",
          name: "Get Forecast",
          description: "Returns a 3-day weather forecast for a given city.",
          tags: ["weather", "forecast"],
          examples: ["3-day forecast for Paris"],
        },
      ],
      defaultInputModes: ["text/plain"],
      defaultOutputModes: ["text/plain", "application/json"],
      protocolVersions: ["0.3"],
    },
    handle: (text) => {
      const cityMatch = text.match(/(?:in|for|at)\s+([A-Za-z\s]+)/i);
      const city = cityMatch?.[1]?.trim() || "Unknown City";
      const temp = Math.floor(Math.random() * 35) - 5;
      const conditions = ["Sunny", "Cloudy", "Rainy", "Partly Cloudy", "Snowy", "Windy"];
      const condition = conditions[Math.floor(Math.random() * conditions.length)];
      const humidity = Math.floor(Math.random() * 60) + 30;

      return [
        {
          text: `Weather for ${city}:\n- Temperature: ${temp}°C\n- Condition: ${condition}\n- Humidity: ${humidity}%\n- Wind: ${Math.floor(Math.random() * 30) + 5} km/h`,
        },
        {
          data: {
            city,
            temperature: temp,
            unit: "celsius",
            condition,
            humidity,
            wind_kmh: Math.floor(Math.random() * 30) + 5,
          },
        },
      ];
    },
  },

  translator: {
    card: {
      name: "Translator Agent",
      url: `${MOCK_URL_PREFIX}translator`,
      version: "1.0.0",
      description: "A mock translation agent. Simulates translating text between languages for testing purposes.",
      provider: { name: "Agent Card Editor", organization: "Mock" },
      capabilities: { streaming: false, pushNotifications: false },
      skills: [
        {
          id: "translate",
          name: "Translate",
          description: "Translates text to a target language. Specify the target language in your message.",
          tags: ["translation", "language", "nlp"],
          examples: [
            'Translate "Hello" to German',
            'Say "Good morning" in French',
            'How do you say "Thank you" in Japanese?',
          ],
        },
        {
          id: "detect-language",
          name: "Detect Language",
          description: "Detects the language of a given text.",
          tags: ["language", "detection"],
          examples: ["detect: Bonjour", "detect: Guten Tag"],
        },
        {
          id: "list-languages",
          name: "List Languages",
          description: "Lists all supported languages for translation.",
          tags: ["language", "info"],
          examples: ["list languages", "supported languages"],
        },
      ],
      defaultInputModes: ["text/plain"],
      defaultOutputModes: ["text/plain"],
      securitySchemes: {
        apiKey: {
          type: "apiKey",
          name: "X-API-Key",
          in: "header",
          description: "API key for translation service (mock: any value accepted)",
        },
      },
      protocolVersions: ["0.3"],
    },
    handle: (text) => {
      const translations: Record<string, Record<string, string>> = {
        german: {
          "hello": "Hallo",
          "good morning": "Guten Morgen",
          "thank you": "Danke",
          "goodbye": "Auf Wiedersehen",
        },
        french: {
          "hello": "Bonjour",
          "good morning": "Bon matin",
          "thank you": "Merci",
          "goodbye": "Au revoir",
        },
        spanish: {
          "hello": "Hola",
          "good morning": "Buenos días",
          "thank you": "Gracias",
          "goodbye": "Adiós",
        },
        japanese: {
          "hello": "こんにちは",
          "good morning": "おはようございます",
          "thank you": "ありがとう",
          "goodbye": "さようなら",
        },
      };

      const lower = text.toLowerCase();

      // Handle list languages
      if (lower.includes("list language") || lower.includes("supported language")) {
        return [{ text: "Supported languages: German, French, Spanish, Japanese" }];
      }

      // Handle language detection
      if (lower.startsWith("detect:")) {
        const sample = text.slice(7).trim().toLowerCase();
        const langPhrases: Record<string, string[]> = {
          German: ["hallo", "guten", "danke", "auf wiedersehen", "morgen"],
          French: ["bonjour", "merci", "au revoir", "bon matin"],
          Spanish: ["hola", "buenos", "gracias", "adiós"],
          Japanese: ["こんにちは", "おはよう", "ありがとう", "さようなら"],
        };
        for (const [lang, phrases] of Object.entries(langPhrases)) {
          if (phrases.some((p) => sample.includes(p))) {
            return [{ text: `Detected language: ${lang}` }];
          }
        }
        return [{ text: "Detected language: English (or unknown)" }];
      }

      let targetLang = "german";
      for (const lang of Object.keys(translations)) {
        if (lower.includes(lang)) {
          targetLang = lang;
          break;
        }
      }

      const dict = translations[targetLang];
      for (const [phrase, translation] of Object.entries(dict)) {
        if (lower.includes(phrase)) {
          return [
            {
              text: `Translation (${targetLang}): "${phrase}" → "${translation}"`,
            },
          ];
        }
      }

      const words = text.split(/\s+/);
      const mock = words.reverse().join(" ");
      return [
        {
          text: `Translation (${targetLang}, approximate): "${mock}"\n\nNote: This is a mock translation agent. Only common phrases like "hello", "good morning", "thank you", and "goodbye" have real translations.`,
        },
      ];
    },
  },

  calculator: {
    card: {
      name: "Calculator Agent",
      url: `${MOCK_URL_PREFIX}calculator`,
      version: "1.0.0",
      description:
        'A calculator agent that accepts JSON input with math operations. Send a JSON object with "operation", "a", and "b" fields.',
      provider: { name: "Agent Card Editor", organization: "Mock" },
      capabilities: { streaming: false, pushNotifications: false },
      skills: [
        {
          id: "calculate",
          name: "Calculate",
          description:
            "Performs a math operation on two numbers. Accepts JSON with fields: operation (add, subtract, multiply, divide), a (number), b (number).",
          tags: ["math", "calculator", "json"],
          inputModes: ["application/json", "text/plain"],
          outputModes: ["application/json", "text/plain"],
          examples: ['{"operation": "add", "a": 5, "b": 3}', '{"operation": "multiply", "a": 12, "b": 7}'],
        },
        {
          id: "percentage",
          name: "Percentage",
          description: "Calculates percentage. Send JSON with: operation 'percentage', a (value), b (percentage).",
          tags: ["math", "percentage"],
          inputModes: ["application/json", "text/plain"],
          outputModes: ["application/json", "text/plain"],
          examples: ['{"operation": "percentage", "a": 200, "b": 15}'],
        },
        {
          id: "power",
          name: "Power",
          description: "Calculates a raised to power b. Send JSON with: operation 'power', a (base), b (exponent).",
          tags: ["math", "exponent"],
          inputModes: ["application/json", "text/plain"],
          outputModes: ["application/json", "text/plain"],
          examples: ['{"operation": "power", "a": 2, "b": 8}'],
        },
      ],
      defaultInputModes: ["application/json", "text/plain"],
      defaultOutputModes: ["application/json", "text/plain"],
      protocolVersions: ["0.3"],
    },
    handle: (_text, parts) => {
      let input: { operation?: string; a?: number; b?: number } | null = null;

      const dataPart = parts.find(isDataPart);
      if (dataPart) {
        input = dataPart.data as unknown as typeof input;
      } else {
        const textPart = parts.find(isTextPart);
        if (textPart) {
          try {
            input = JSON.parse(textPart.text);
          } catch {
            return [
              {
                text: 'Invalid input. Send a JSON object with "operation" (add, subtract, multiply, divide, percentage, power), "a" (number), and "b" (number).',
              },
            ];
          }
        }
      }

      if (!input || input.a == null || input.b == null || !input.operation) {
        return [
          {
            text: 'Missing fields. Required: { "operation": "add|subtract|multiply|divide|percentage|power", "a": number, "b": number }',
          },
        ];
      }

      const { operation, a, b } = input;
      let result: number;
      switch (operation) {
        case "add":
          result = a + b;
          break;
        case "subtract":
          result = a - b;
          break;
        case "multiply":
          result = a * b;
          break;
        case "divide":
          if (b === 0) {
            return [{ text: "Error: Division by zero" }];
          }
          result = a / b;
          break;
        case "percentage":
          result = (a * b) / 100;
          break;
        case "power":
          result = Math.pow(a, b);
          break;
        default:
          return [
            {
              text: `Unknown operation "${operation}". Supported: add, subtract, multiply, divide, percentage, power`,
            },
          ];
      }

      return [
        {
          text: operation === "percentage" ? `${b}% of ${a} = ${result}` : `${a} ${operation} ${b} = ${result}`,
        },
        {
          data: { operation, a, b, result },
        },
      ];
    },
  },
};

/**
 * Get the agent card for a mock agent URL.
 */
export function getMockAgentCard(url: string): AgentCard | null {
  const id = getMockAgentId(url);
  return MOCK_AGENTS[id]?.card ?? null;
}

/**
 * Handle a JSON-RPC message/send for a mock agent, returning a full JSON-RPC response.
 */
export function handleMockMessage(
  url: string,
  message: { parts: Part[]; messageId?: string; contextId?: string | null },
) {
  const id = getMockAgentId(url);
  const agent = MOCK_AGENTS[id];
  if (!agent) {
    return {
      jsonrpc: "2.0",
      id: null,
      error: { code: -32600, message: `Mock agent "${id}" not found` },
    };
  }

  const textInput = message.parts
    .filter(isTextPart)
    .map((p) => p.text)
    .join("\n");

  const responseParts = agent.handle(textInput, message.parts);
  const taskId = uuidv4();
  const contextId = message.contextId ?? uuidv4();
  const responseMessageId = uuidv4();

  return {
    jsonrpc: "2.0",
    id: uuidv4(),
    result: {
      id: taskId,
      contextId,
      status: {
        state: "completed",
        timestamp: new Date().toISOString(),
        message: {
          role: "agent",
          parts: responseParts,
          messageId: responseMessageId,
          contextId,
          taskId,
        },
      },
      artifacts: [
        {
          artifactId: uuidv4(),
          parts: responseParts,
          lastChunk: true,
        },
      ],
      history: [
        { role: "user", parts: message.parts, messageId: message.messageId },
        { role: "agent", parts: responseParts, messageId: responseMessageId },
      ],
    },
  };
}
