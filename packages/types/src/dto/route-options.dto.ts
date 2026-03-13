import type { RouteMode } from "../entities/enums";

/** Full preset interface. All properties required. */
export interface IRouteOptions {
  minPoints: number;
  maxPoints: number;
  minDurationMinutes: number | undefined;
  maxDurationMinutes: number | undefined;
  minDistanceKm: Record<RouteMode, number | undefined>;
  maxDistanceKm: Record<RouteMode, number | undefined>;
  minThemePlaces: number;
  clusterRadiusMeters: number;
  maxClusters: number;
  routeModes: RouteMode[];
  durationPresetsMinutes: number[];
  seedsPerCluster: number;
  candidateRadiusMeters: Record<RouteMode, number>;
}
