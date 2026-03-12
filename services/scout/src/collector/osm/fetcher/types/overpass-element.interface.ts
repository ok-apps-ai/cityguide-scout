/**
 * Overpass API element (node, way, or relation).
 * @see https://dev.overpass-api.de/output_formats.html
 */
export interface IOverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
  nodes?: number[];
  members?: Array<{ type: string; ref: number; role?: string }>;
}
