import { DataSource } from "typeorm";

import type { IPlace } from "@framework/types";

import { ns } from "../../../common/constants";
import { ICluster, RouteGenerationState } from "../state";

const DBSCAN_MIN_POINTS = 3;

export const makeSpatialClusteringNode = (dataSource: DataSource) => {
  return async (state: RouteGenerationState): Promise<Partial<RouteGenerationState>> => {
    if (state.places.length === 0) {
      return { clusters: [] };
    }

    const { clusterRadiusMeters } = state.routeGenerationOptions;
    const epsDegrees = clusterRadiusMeters / 111320;

    const rows: Array<{ id: string; cluster_id: number }> = await dataSource.query(
      `SELECT id::text,
              ST_ClusterDBSCAN(geom, eps := $1, minpoints := $2) OVER () AS cluster_id
       FROM ${ns}.places
       WHERE city_id = $3`,
      [epsDegrees, DBSCAN_MIN_POINTS, state.cityId],
    );

    const placeById = new Map<string, IPlace>(state.places.map(p => [p.id, p]));
    const clusterMap = new Map<number, IPlace[]>();

    for (const row of rows) {
      if (row.cluster_id === null) continue;
      const place = placeById.get(row.id);
      if (!place) continue;
      const list = clusterMap.get(row.cluster_id) ?? [];
      list.push(place);
      clusterMap.set(row.cluster_id, list);
    }

    const clusters: ICluster[] = [];

    for (const [clusterId, places] of clusterMap.entries()) {
      const coordRows: Array<{ lat: number; lng: number }> = await dataSource.query(
        `SELECT AVG(ST_Y(ST_Centroid(geom::geometry))) as lat, AVG(ST_X(ST_Centroid(geom::geometry))) as lng
         FROM ${ns}.places
         WHERE id = ANY($1::uuid[])`,
        [places.map(p => p.id)],
      );

      const { lat, lng } = coordRows[0];

      const seedPlace = places.reduce((best, p) => {
        const bw = state.weightedPlaces.find(w => w.place.id === best.id)?.weight ?? 0;
        const pw = state.weightedPlaces.find(w => w.place.id === p.id)?.weight ?? 0;
        return pw > bw ? p : best;
      }, places[0]);

      clusters.push({ id: clusterId, places, centroidLat: lat, centroidLng: lng, seedPlace });
    }

    return { clusters };
  };
};
