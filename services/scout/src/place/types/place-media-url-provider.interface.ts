/**
 * Replaceable provider for fetching place media (photo) URLs.
 * Default implementation uses Google Place Photos getMedia; can be swapped for
 * long-lived URLs or another provider.
 */
export interface IPlaceMediaUrlProvider {
  getPlaceMediaUrl(photoName: string): Promise<string | null>;
}
