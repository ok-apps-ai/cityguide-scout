/**
 * OSM tag keys used for POI collection (included in Overpass query).
 * Reference: cityguide-backend Overpass queries.
 */
export const INCLUDED_OSM_TAG_KEYS = [
  "tourism",
  "historic",
  "amenity",
  "leisure",
  "natural",
  "man_made",
  "building",
  "shop",
] as const;

export type OsmPoiTagKey = (typeof INCLUDED_OSM_TAG_KEYS)[number];

/** OSM tag values to exclude from POI collection. Format: "key:value" */
export const EXCLUDED_OSM_TAG_VALUES: readonly string[] = ["amenity:casino"];
