import type { RouteMode } from "../entities/enums";

export interface IFindRoutesDto {
  routeMode?: RouteMode;
}

export interface IFindRoutesByCityPayload {
  cityId: string;
  routeMode?: RouteMode;
}
