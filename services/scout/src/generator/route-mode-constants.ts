import { RouteMode } from "../route/route.entity";

export const ROUTE_MODE_SPEED_KMH: Record<RouteMode, number> = {
  [RouteMode.WALKING]: 5,
  [RouteMode.CYCLING]: 14,
  [RouteMode.DRIVING]: 36,
};
