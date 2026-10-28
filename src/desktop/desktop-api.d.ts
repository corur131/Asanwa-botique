export {};

declare global {
  interface Window {
    asanwaDesktop?: {
      readonly isDesktop: true;
      requestGoogleToken(): Promise<string>;
      postAiChat(jsonBody: string): Promise<{ status: number; body: string }>;
    };
  }
}
