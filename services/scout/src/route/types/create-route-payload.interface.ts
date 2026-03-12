import type { PriceLevel } from "../../place/place.entity";
import type { RouteMode, RouteTheme } from "../route.entity";

export interface ICreateRoutePayload {
  cityId: string;
  name: string;
  theme: RouteTheme;
  routeMode: RouteMode;
  durationMinutes: number;
  distanceKm: number;
  priceLevel: PriceLevel;
  startPlaceId?: string | null;
  routeGeometryWkt: string;
  stops: Array<{
    placeId: string;
    orderIndex: number;
    visitDurationMinutes?: number | null;
  }>;
}
