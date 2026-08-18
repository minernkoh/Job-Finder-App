/**
 * Simulated NDJSON stream for guest preview (mimics real AI streaming endpoints).
 */

const STREAM_DELAY_MS = 120;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Builds a ReadableStream reader that emits NDJSON lines with short delays. */
export async function createSimulatedNdjsonReader<T extends Record<string, unknown>>(
  partials: Partial<T>[],
  final: T,
): Promise<ReadableStreamDefaultReader<Uint8Array>> {
  const lines = [
    ...partials.map((p) => JSON.stringify(p)),
    JSON.stringify({ ...final, _complete: true }),
  ];
  let index = 0;
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (index >= lines.length) {
        controller.close();
        return;
      }
      await sleep(STREAM_DELAY_MS);
      controller.enqueue(encoder.encode(`${lines[index]}\n`));
      index += 1;
    },
  });

  return stream.getReader();
}

/** Wraps simulated stream in a fetch Response (for compare stream helper). */
export function ndjsonStreamResponse(
  reader: ReadableStreamDefaultReader<Uint8Array>,
): Response {
  const stream = new ReadableStream({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
        return;
      }
      controller.enqueue(value);
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { "Content-Type": "application/x-ndjson" },
  });
}
