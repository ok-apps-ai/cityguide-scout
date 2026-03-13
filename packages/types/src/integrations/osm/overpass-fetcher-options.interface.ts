import type { IBbox } from "./bbox.interface";

export interface IOverpassFetcherOptions {
  bbox: IBbox;
  /** Overpass QL query. Default fetches tourism, historic, amenity, leisure nodes and ways. */
  query?: string;
  /** Tile size in degrees. Bbox is split into nLat×nLng tiles where each dimension uses ceil(span / tileSizeDeg). Omit for single tile. */
  tileSizeDeg?: number;
}
