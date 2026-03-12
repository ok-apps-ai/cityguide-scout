import type { RouteMode } from "../../route/route.entity";

/** Full preset interface. All properties required. */
export interface IRouteOptions {
  minPoints: number;
  maxPoints: number;
  minDurationMinutes: number | undefined;
  maxDurationMinutes: number | undefined;
  minDistanceKm: number | undefined;
  maxDistanceKm: number | undefined;
  minThemePlaces: number;
  clusterRadiusMeters: number;
  maxClusters: number;
  routeModes: RouteMode[];
  durationPresetsMinutes: number[];
  seedsPerCluster: number;
  candidateRadiusMeters: Record<RouteMode, number>;
}
