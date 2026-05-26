import { useChatStore } from "@lib/stores/chatStore";
import { useConnectionStore, selectEffectiveUrl } from "@lib/stores/connectionStore";
import { useAgentCardStore } from "@lib/stores/agentCardStore";
import { useIsLargeScreen } from "@lib/hooks/useMediaQuery";
import { ScrollArea, Button, ChatInput, TypingIndicator } from "@open-resource-discovery/ui-components";
import { ChatMessage } from "./ChatMessage";
import { Trash2, Play } from "lucide-react";
import type { Part } from "@lib/types/a2a";

interface ChatContainerProps {
  maxExamplePrompts?: number;
  disableExamplePrompts?: boolean;
}

export function ChatContainer({ maxExamplePrompts = 2, disableExamplePrompts = false }: ChatContainerProps) {
  const { messages, isStreaming, sendMessage, cancelStream, retryMessage, clearChat } = useChatStore();
  const { connectionStatus, authHeaders } = useConnectionStore();
  const effectiveUrl = useConnectionStore(selectEffectiveUrl);
  const parsedCard = useAgentCardStore((state) => state.parsedCard);
  const isLargeScreen = useIsLargeScreen();

  const isConnected = connectionStatus === "connected";

  const allExamplePrompts: string[] = [];
  if (parsedCard?.skills) {
    for (const skill of parsedCard.skills) {
      if (skill.examples) {
        allExamplePrompts.push(...skill.examples);
      }
    }
  }

  const desktopLimit = maxExamplePrompts;
  const mobileLimit = Math.min(maxExamplePrompts, 2);
  const examplePrompts = allExamplePrompts.slice(0, isLargeScreen ? desktopLimit : mobileLimit);

  const handleSend = (value: string) => {
    let parts: Part[];
    try {
      parts = [{ data: JSON.parse(value) }];
    } catch {
      parts = [{ text: value }];
    }
    sendMessage(parts, effectiveUrl, authHeaders);
  };

  const handleExampleClick = (example: string) => {
    if (!isConnected || isStreaming) return;
    sendMessage([{ text: example }], effectiveUrl, authHeaders);
  };

  const handleRetry = (messageId: string) => {
    retryMessage(messageId, effectiveUrl, authHeaders);
  };

  return (
    <div className="flex h-full flex-col">
      {messages.length > 0 && (
        <div className="flex items-center justify-end border-b px-4 py-1.5">
          <Button variant="ghost" size="sm" onClick={clearChat} data-testid="chat-clear">
            <Trash2 className="mr-1 h-3.5 w-3.5" />
            Clear
          </Button>
        </div>
      )}

      <ScrollArea className="min-h-0 flex-1" autoScroll>
        <div className="p-4" data-testid="chat-messages">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <p className="text-sm text-muted-foreground">
                {examplePrompts.length > 0
                  ? "Try one of these prompts:"
                  : "No messages yet. Connect to an agent and start chatting."}
              </p>
              {examplePrompts.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2">
                  {examplePrompts.map((example, index) => (
                    <button
                      key={index}
                      data-testid={`example-prompt-${index}`}
                      onClick={() => handleExampleClick(example)}
                      disabled={!isConnected || isStreaming || disableExamplePrompts}
                      className="group inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 text-xs text-foreground cursor-pointer transition-colors hover:bg-accent hover:text-accent-foreground active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
                      <Play className="h-3 w-3 text-success" />
                      <span className="max-w-48 truncate">{example}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  onRetry={message.role === "user" ? () => handleRetry(message.id) : undefined}
                />
              ))}
              {isStreaming && !messages[messages.length - 1]?.isStreaming && <TypingIndicator />}
            </>
          )}
        </div>
      </ScrollArea>

      {messages.length > 0 && examplePrompts.length > 0 && (
        <div className="border-t px-3 py-2">
          <div className="flex flex-wrap gap-1.5">
            {examplePrompts.map((example, index) => (
              <button
                key={index}
                onClick={() => handleExampleClick(example)}
                disabled={!isConnected || isStreaming}
                className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-1 text-[11px] text-foreground cursor-pointer transition-colors hover:bg-accent hover:text-accent-foreground active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
                <Play className="h-2.5 w-2.5 text-green-500" />
                <span className="max-w-32 truncate">{example}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <ChatInput
        data-testid="chat-form"
        onSubmit={handleSend}
        loading={isStreaming}
        onCancel={cancelStream}
        disabled={!isConnected}
        placeholder={isConnected ? "Type a message or JSON..." : "Connect to an agent to chat..."}
      />
    </div>
  );
}
