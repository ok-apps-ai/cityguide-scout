import type { RouteMode } from "../entities/enums";

/** Full preset interface. All properties required. Single routeMode per invocation. */
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
  routeMode: RouteMode;
  durationPresetsMinutes: number[];
  seedsPerCluster: number;
  candidateRadiusMeters: number;
}
