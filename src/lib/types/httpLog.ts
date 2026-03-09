export interface HttpLogEntry {
  id: string;
  chatMessageId: string;
  timestamp: Date;
  request: {
    method: string;
    url: string;
    headers: Record<string, string>;
    body: string;
  };
  response: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: string;
  } | null;
  error?: string;
  durationMs?: number;
  derivedFromLogId?: string;
}
