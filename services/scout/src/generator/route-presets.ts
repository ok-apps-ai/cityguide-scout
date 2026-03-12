import { RouteMode } from "../route/route.entity";
import type { IRouteOptions } from "./dto/route-generation-options.interface";

export const ROUTE_MODE_RADIUS_METERS: Record<RouteMode, number> = {
  [RouteMode.WALKING]: 3000,
  [RouteMode.CYCLING]: 6000,
  [RouteMode.DRIVING]: 10000,
};

/** Default preset: single walking route for 1 hour (sufficient for tests). */
export const DEFAULT_ROUTE_GENERATION_OPTIONS: IRouteOptions = {
  minPoints: 1,
  maxPoints: 100,
  minDurationMinutes: undefined,
  maxDurationMinutes: undefined,
  minDistanceKm: 4,
  maxDistanceKm: undefined,
  minThemePlaces: 3,
  clusterRadiusMeters: 500,
  maxClusters: 1,
  routeModes: [RouteMode.WALKING],
  durationPresetsMinutes: [60],
  seedsPerCluster: 1,
  candidateRadiusMeters: { ...ROUTE_MODE_RADIUS_METERS },
};
