/**
 * The desktop build uses a narrow Electron IPC bridge for the existing AI API.
 * Browser and Android builds continue using their normal HTTP endpoint.
 * The Gemini API key always remains on the server.
 */
export async function postAiChat(payload: unknown, signal: AbortSignal): Promise<Response> {
  const body = JSON.stringify(payload);
  if (window.asanwaDesktop) {
    const result = await window.asanwaDesktop.postAiChat(body);
    if (signal.aborted) throw new DOMException('Request timed out', 'AbortError');
    return new Response(result.body, {
      status: result.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return fetch((import.meta.env.VITE_AI_API_BASE_URL || '') + '/api/ai-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body,
  });
}
