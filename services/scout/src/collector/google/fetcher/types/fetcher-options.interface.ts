export interface IFetcherOptions {
  /** Location center */
  location: { lat: number; lng: number };
  /** Place types to include. When >50, split into batches of 50. */
  includedTypes: readonly string[];
  /** Place types to exclude from results. */
  excludedTypes?: readonly string[];
  /** Search radius in meters */
  radiusMeters?: number;
  /** API key (defaults to GOOGLE_API_KEY from config) */
  apiKey?: string;
}
