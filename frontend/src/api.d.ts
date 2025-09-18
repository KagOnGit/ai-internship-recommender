declare module './api' {
  export class OfflineFallbackError extends Error {
    fallback: any;
  }

  export const BASE_URL: string;
  export function fetchOptions(): Promise<any>;
  export function fetchRecommendations(payload: any, topK?: number): Promise<any>;
}
