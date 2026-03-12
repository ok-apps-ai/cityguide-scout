import type { PlaceEntity } from "../../../place/place.entity";
import type { RouteMode, RouteTheme } from "../../../route/route.entity";
import type { ICluster } from "./cluster.interface";

export interface IRouteSeed {
  theme: RouteTheme;
  routeMode: RouteMode;
  durationBudgetMinutes: number;
  startPlace: PlaceEntity;
  cluster: ICluster;
}
