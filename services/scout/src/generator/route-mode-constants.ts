import { RouteMode } from "@framework/types";

export const ROUTE_MODE_SPEED_KMH: Record<RouteMode, number> = {
  [RouteMode.WALKING]: 5,
  [RouteMode.BICYCLING]: 14,
  [RouteMode.DRIVING]: 36,
};
