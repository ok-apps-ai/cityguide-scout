import { RouteMode } from "@framework/types";
import type { IRouteOptions } from "@framework/types";

const SHARED_OPTIONS: Omit<IRouteOptions, "routeMode" | "minDistanceKm" | "maxDistanceKm" | "candidateRadiusMeters"> = {
  minPoints: 20,
  maxPoints: 50,
  minDurationMinutes: undefined,
  maxDurationMinutes: undefined,
  minThemePlaces: 3,
  clusterRadiusMeters: 500,
  maxClusters: 3,
  durationPresetsMinutes: [60],
  seedsPerCluster: 3,
};

export const WALKING_ROUTE_GENERATION_OPTIONS: IRouteOptions = {
  ...SHARED_OPTIONS,
  routeMode: RouteMode.WALKING,
  minDistanceKm: 2,
  maxDistanceKm: 8,
  candidateRadiusMeters: 3000,
};

export const BICYCLING_ROUTE_GENERATION_OPTIONS: IRouteOptions = {
  ...SHARED_OPTIONS,
  routeMode: RouteMode.BICYCLING,
  minDistanceKm: 5,
  maxDistanceKm: 25,
  candidateRadiusMeters: 6000,
};

export const DRIVING_ROUTE_GENERATION_OPTIONS: IRouteOptions = {
  ...SHARED_OPTIONS,
  routeMode: RouteMode.DRIVING,
  minDistanceKm: 10,
  maxDistanceKm: 50,
  candidateRadiusMeters: 10000,
};
