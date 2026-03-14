import type { IBbox } from "./types";

export function buildOverpassQuery(bbox: IBbox, includedTagKeys: readonly string[]): string {
  const bboxStr = `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`;
  const nodeLines = includedTagKeys.map(k => `node["${k}"]["name"](${bboxStr})`);
  const wayLines = includedTagKeys.map(k => `way["${k}"]["name"](${bboxStr})`);
  const union = [...nodeLines, ...wayLines].join(";\n        ");
  return `[out:json][timeout:25];
      (
        ${union};
      );
      out body center;`;
}
