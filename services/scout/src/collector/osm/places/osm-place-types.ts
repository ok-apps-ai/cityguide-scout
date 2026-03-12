/**
 * OSM tag keys used for POI collection.
 * Reference: cityguide-backend Overpass queries.
 */
export const OSM_POI_TAG_KEYS = [
  "tourism",
  "historic",
  "amenity",
  "leisure",
  "natural",
  "man_made",
  "building",
  "shop",
] as const;

export type OsmPoiTagKey = (typeof OSM_POI_TAG_KEYS)[number];
