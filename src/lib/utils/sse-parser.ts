/**
 * Server-Sent Events (SSE) line protocol parser.
 *
 * Takes a ReadableStream<Uint8Array> (from fetch response.body)
 * and yields parsed SSE events as they arrive.
 */

export interface SSEEvent {
  event?: string;
  data: string;
  id?: string;
}

/**
 * Parse an SSE stream into individual events.
 * Handles buffering, multi-line data fields, and comment lines.
 */
export async function* parseSSEStream(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<SSEEvent> {
  const decoder = new TextDecoder();
  const reader = body.getReader();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete events (delimited by double newlines)
      let boundary: number;
      while ((boundary = buffer.indexOf("\n\n")) !== -1) {
        const block = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);

        const event = parseSSEBlock(block);
        if (event) yield event;
      }
    }

    // Process any remaining data in the buffer
    if (buffer.trim()) {
      const event = parseSSEBlock(buffer);
      if (event) yield event;
    }
  } finally {
    reader.releaseLock();
  }
}

/** Parse a single SSE block (lines between \n\n boundaries) into an event. */
function parseSSEBlock(block: string): SSEEvent | null {
  let eventType: string | undefined;
  let id: string | undefined;
  const dataLines: string[] = [];

  for (const line of block.split("\n")) {
    // Comment line — ignore
    if (line.startsWith(":")) continue;

    // Empty line within a block — skip
    if (line === "") continue;

    const colonIndex = line.indexOf(":");
    let field: string;
    let value: string;

    if (colonIndex === -1) {
      field = line;
      value = "";
    } else {
      field = line.slice(0, colonIndex);
      // Spec: if the character immediately after the colon is a space, skip it
      value = line[colonIndex + 1] === " " ? line.slice(colonIndex + 2) : line.slice(colonIndex + 1);
    }

    switch (field) {
      case "data":
        dataLines.push(value);
        break;
      case "event":
        eventType = value;
        break;
      case "id":
        id = value;
        break;
      // "retry" and unknown fields are ignored per spec
    }
  }

  // No data lines means no event to emit
  if (dataLines.length === 0) return null;

  return {
    event: eventType,
    data: dataLines.join("\n"),
    id,
  };
}
