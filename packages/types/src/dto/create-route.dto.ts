import type { IRouteOptions } from "./route-options.dto";
import type { PriceLevel, RouteMode, RouteTheme } from "../entities/enums";

export interface ICreateRouteStopPayload {
  placeId: string;
  orderIndex: number;
  visitDurationMinutes?: number | null;
}

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
  generationOptions: IRouteOptions;
  stops: ICreateRouteStopPayload[];
}
