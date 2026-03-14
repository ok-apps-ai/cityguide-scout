import { buildOverpassQuery } from "./overpass-query";
import { INCLUDED_OSM_TAG_KEYS } from "../places/osm-place-types";

const bbox = { south: 36.5, west: -5.0, north: 36.6, east: -4.9 };

describe("buildOverpassQuery", () => {
  it("includes [out:json] and [timeout:25] in output", () => {
    const query = buildOverpassQuery(bbox, ["tourism"]);
    expect(query).toContain("[out:json]");
    expect(query).toContain("[timeout:25]");
  });

  it("ends with out body center", () => {
    const query = buildOverpassQuery(bbox, ["tourism"]);
    expect(query).toContain("out body center;");
  });

  it("formats bbox as south,west,north,east", () => {
    const query = buildOverpassQuery(bbox, ["tourism"]);
    expect(query).toContain("36.5,-5,36.6,-4.9");
  });

  it("includes node and way queries for each tag key", () => {
    const tagKeys = ["tourism", "amenity"];
    const query = buildOverpassQuery(bbox, tagKeys);

    for (const key of tagKeys) {
      expect(query).toContain(`node["${key}"]["name"]`);
      expect(query).toContain(`way["${key}"]["name"]`);
    }
  });

  it("produces valid query with INCLUDED_OSM_TAG_KEYS", () => {
    const query = buildOverpassQuery(bbox, INCLUDED_OSM_TAG_KEYS);

    expect(query).toContain("[out:json][timeout:25]");
    expect(query).toContain("out body center;");
    expect(query).toContain("36.5,-5,36.6,-4.9");

    for (const key of INCLUDED_OSM_TAG_KEYS) {
      expect(query).toContain(`node["${key}"]["name"]`);
      expect(query).toContain(`way["${key}"]["name"]`);
    }
  });

  it("handles empty tag keys", () => {
    const query = buildOverpassQuery(bbox, []);
    expect(query).toContain("[out:json]");
    expect(query).toContain("out body center;");
    expect(query).not.toContain("node[");
    expect(query).not.toContain("way[");
  });
});
