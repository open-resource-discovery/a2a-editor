import { useChatStore } from "@lib/stores/chatStore";
import { useConnectionStore, selectEffectiveUrl } from "@lib/stores/connectionStore";
import { Button } from "@lib/components/ui/button";
import { Input } from "@lib/components/ui/input";
import { Send, Square } from "lucide-react";

interface ChatInputProps {
  disabled?: boolean;
}

export function ChatInput({ disabled }: ChatInputProps) {
  const { inputText, setInputText, sendMessage, cancelStream, isStreaming } = useChatStore();
  const { authHeaders } = useConnectionStore();
  const effectiveUrl = useConnectionStore(selectEffectiveUrl);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isStreaming || disabled) return;

    // Try to parse as JSON, otherwise send as text
    let parts;
    try {
      const parsed = JSON.parse(inputText);
      parts = [{ data: parsed }];
    } catch {
      parts = [{ text: inputText }];
    }

    sendMessage(parts, effectiveUrl, authHeaders);
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 border-t p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <Input
        data-testid="chat-input"
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        placeholder={disabled ? "Connect to an agent to chat..." : "Type a message or JSON..."}
        disabled={disabled || isStreaming}
        className="flex-1"
      />
      {isStreaming ? (
        <Button type="button" size="icon" variant="destructive" onClick={cancelStream} title="Stop streaming">
          <Square className="h-4 w-4" />
        </Button>
      ) : (
        <Button type="submit" size="icon" disabled={disabled || !inputText.trim()} data-testid="chat-send">
          <Send className="h-4 w-4" />
        </Button>
      )}
    </form>
  );
}
