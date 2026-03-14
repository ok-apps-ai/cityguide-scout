import type { IPlace, RouteMode, RouteTheme } from "@framework/types";

import type { ICluster } from "./cluster.interface";

export interface IRouteSeed {
  theme: RouteTheme;
  routeMode: RouteMode;
  durationBudgetMinutes: number;
  startPlace: IPlace;
  cluster: ICluster;
}
