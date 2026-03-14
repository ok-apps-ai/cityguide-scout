import type { PriceLevel, RouteMode, RouteTheme } from "@framework/types";

import type { IRouteStop } from "./route-stop.interface";

export interface IBuiltRoute {
  name: string;
  theme: RouteTheme;
  routeMode: RouteMode;
  durationMinutes: number;
  distanceKm: number;
  priceLevel: PriceLevel;
  startPlaceId: string;
  routeGeometryWkt: string;
  stops: IRouteStop[];
}
