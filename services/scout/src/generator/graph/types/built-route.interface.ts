import type { PriceLevel } from "../../../place/place.entity";
import type { RouteMode, RouteTheme } from "../../../route/route.entity";
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
