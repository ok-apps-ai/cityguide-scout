import type { PriceLevel, RouteMode, RouteTheme } from "./enums";

export interface IRoute {
  id: string;
  cityId: string;
  name: string;
  theme: RouteTheme;
  routeMode: RouteMode;
  durationMinutes: number;
  distanceKm: number;
  priceLevel: PriceLevel;
  startPlaceId: string | null;
  routeGeometry: string;
  createdAt: Date;
}
