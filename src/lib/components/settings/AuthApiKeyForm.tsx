import { useConnectionStore } from "@lib/stores/connectionStore";
import { Input } from "@lib/components/ui/input";
import { PasswordInput } from "@lib/components/ui/PasswordInput";

export function AuthApiKeyForm() {
  const { apiKeyCredentials, setApiKeyCredentials } = useConnectionStore();

  return (
    <div className="space-y-2">
      <Input
        placeholder="Header name (e.g., X-API-Key)"
        value={apiKeyCredentials.headerName}
        onChange={(e) => setApiKeyCredentials({ headerName: e.target.value })}
      />
      <PasswordInput
        placeholder="API Key"
        value={apiKeyCredentials.key}
        onChange={(e) => setApiKeyCredentials({ key: e.target.value })}
      />
    </div>
  );
}
