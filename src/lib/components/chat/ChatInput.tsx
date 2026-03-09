import { useChatStore } from "@lib/stores/chatStore";
import { useConnectionStore } from "@lib/stores/connectionStore";
import { Button } from "@lib/components/ui/button";
import { Input } from "@lib/components/ui/input";
import { Send, Loader2 } from "lucide-react";

interface ChatInputProps {
  disabled?: boolean;
}

export function ChatInput({ disabled }: ChatInputProps) {
  const { inputText, setInputText, sendMessage, isStreaming } = useChatStore();
  const { url, authHeaders } = useConnectionStore();

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

    sendMessage(parts, url, authHeaders);
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 border-t p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <Input
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        placeholder={
          disabled
            ? "Connect to an agent to chat..."
            : "Type a message or JSON..."
        }
        disabled={disabled || isStreaming}
        className="flex-1"
      />
      <Button
        type="submit"
        size="icon"
        disabled={disabled || isStreaming || !inputText.trim()}
      >
        {isStreaming ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </Button>
    </form>
  );
}
