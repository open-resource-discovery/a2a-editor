import { useConnectionStore } from "@lib/stores/connectionStore";
import { Input } from "@lib/components/ui/input";
import { PasswordInput } from "@lib/components/ui/PasswordInput";

export function AuthBasicForm() {
  const { basicCredentials, setBasicCredentials } = useConnectionStore();

  return (
    <div className="space-y-2">
      <Input
        placeholder="Username"
        value={basicCredentials.username}
        onChange={(e) => setBasicCredentials({ username: e.target.value })}
      />
      <PasswordInput
        placeholder="Password"
        value={basicCredentials.password}
        onChange={(e) => setBasicCredentials({ password: e.target.value })}
      />
    </div>
  );
}
