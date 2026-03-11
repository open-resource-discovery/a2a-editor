import { useEffect, useRef } from "react";
import { useChatStore } from "@lib/stores/chatStore";
import { useConnectionStore } from "@lib/stores/connectionStore";
import { useAgentCardStore } from "@lib/stores/agentCardStore";
import { useIsLargeScreen } from "@lib/hooks/useMediaQuery";
import { ScrollArea } from "@lib/components/ui/scroll-area";
import { Button } from "@lib/components/ui/button";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { TypingIndicator } from "./TypingIndicator";
import { Trash2, Play } from "lucide-react";

interface ChatContainerProps {
  maxExamplePrompts?: number;
  disableExamplePrompts?: boolean;
}

export function ChatContainer({ maxExamplePrompts = 2, disableExamplePrompts = false }: ChatContainerProps) {
  const { messages, isStreaming, sendMessage, retryMessage, clearChat } = useChatStore();
  const { connectionStatus, url, authHeaders } = useConnectionStore();
  const parsedCard = useAgentCardStore((state) => state.parsedCard);
  const isLargeScreen = useIsLargeScreen();
  const scrollViewportRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages (using direct scroll, not scrollIntoView)
  useEffect(() => {
    if (scrollViewportRef.current) {
      scrollViewportRef.current.scrollTo({
        top: scrollViewportRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, isStreaming]);

  const isConnected = connectionStatus === "connected";

  // Get all example prompts from skills
  const allExamplePrompts: string[] = [];
  if (parsedCard?.skills) {
    for (const skill of parsedCard.skills) {
      if (skill.examples) {
        allExamplePrompts.push(...skill.examples);
      }
    }
  }

  // Limit examples based on maxExamplePrompts prop (further reduced on mobile)
  const desktopLimit = maxExamplePrompts;
  const mobileLimit = Math.min(maxExamplePrompts, 2);
  const examplePrompts = allExamplePrompts.slice(0, isLargeScreen ? desktopLimit : mobileLimit);

  const handleExampleClick = (example: string) => {
    if (!isConnected) return;
    sendMessage([{ text: example }], url, authHeaders);
  };

  const handleRetry = (messageId: string) => {
    retryMessage(messageId, url, authHeaders);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Clear button when there are messages */}
      {messages.length > 0 && (
        <div className="flex items-center justify-end border-b px-4 pb-1.5">
          <Button variant="ghost" size="sm" onClick={clearChat} data-testid="chat-clear">
            <Trash2 className="mr-1 h-3.5 w-3.5" />
            Clear
          </Button>
        </div>
      )}

      <ScrollArea className="min-h-0 flex-1" viewportRef={scrollViewportRef}>
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
                      disabled={!isConnected || disableExamplePrompts}
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

      {/* Prompt badges above input (always shown when there are examples and messages) */}
      {messages.length > 0 && examplePrompts.length > 0 && (
        <div className="border-t px-3 py-2">
          <div className="flex flex-wrap gap-1.5">
            {examplePrompts.map((example, index) => (
              <button
                key={index}
                onClick={() => handleExampleClick(example)}
                disabled={!isConnected}
                className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-1 text-[11px] text-foreground cursor-pointer transition-colors hover:bg-accent hover:text-accent-foreground active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
                <Play className="h-2.5 w-2.5 text-green-500" />
                <span className="max-w-32 truncate">{example}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <ChatInput disabled={!isConnected} />
    </div>
  );
}
