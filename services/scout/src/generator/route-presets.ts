import { RouteMode } from "../route/route.entity";
import type { IRouteOptions } from "./dto";

export const ROUTE_MODE_RADIUS_METERS: Record<RouteMode, number> = {
  [RouteMode.WALKING]: 3000,
  [RouteMode.BICYCLING]: 6000,
  [RouteMode.DRIVING]: 10000,
};

export const FULL_ROUTE_GENERATION_OPTIONS: IRouteOptions = {
  minPoints: 20,
  maxPoints: 50,
  minDurationMinutes: undefined,
  maxDurationMinutes: undefined,
  minDistanceKm: 2,
  maxDistanceKm: undefined,
  minThemePlaces: 3,
  clusterRadiusMeters: 500,
  maxClusters: 3,
  routeModes: [RouteMode.WALKING, RouteMode.BICYCLING, RouteMode.DRIVING],
  durationPresetsMinutes: [60],
  seedsPerCluster: 3,
  candidateRadiusMeters: ROUTE_MODE_RADIUS_METERS,
};

export const DEFAULT_ROUTE_GENERATION_OPTIONS: IRouteOptions = {
  minPoints: 1,
  maxPoints: 25,
  minDurationMinutes: undefined,
  maxDurationMinutes: undefined,
  minDistanceKm: 2,
  maxDistanceKm: undefined,
  minThemePlaces: 3,
  clusterRadiusMeters: 500,
  maxClusters: 3,
  routeModes: [RouteMode.WALKING],
  durationPresetsMinutes: [60],
  seedsPerCluster: 1,
  candidateRadiusMeters: ROUTE_MODE_RADIUS_METERS,
};
