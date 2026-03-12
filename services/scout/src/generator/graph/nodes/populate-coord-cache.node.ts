import { DataSource } from "typeorm";

import { ns } from "../../../common/constants";
import { RouteGenerationState } from "../state";

export const makePopulateCoordCacheNode = (
  dataSource: DataSource,
  coordCache: Map<string, { lat: number; lng: number }>,
) => {
  return async (state: RouteGenerationState): Promise<Partial<RouteGenerationState>> => {
    if (state.places.length === 0) {
      return {};
    }

    const rows: Array<{ id: string; lat: number; lng: number }> = await dataSource.query(
      `SELECT id::text,
              ST_Y(ST_Centroid(geom::geometry)) AS lat,
              ST_X(ST_Centroid(geom::geometry)) AS lng
       FROM ${ns}.places
       WHERE id = ANY($1::uuid[])`,
      [state.places.map(p => p.id)],
    );

    for (const row of rows) {
      coordCache.set(row.id, { lat: Number(row.lat), lng: Number(row.lng) });
    }

    return {};
  };
};
