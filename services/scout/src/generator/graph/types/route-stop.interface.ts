import type { IPlace } from "@framework/types";

export interface IRouteStop {
  place: IPlace;
  orderIndex: number;
  visitDurationMinutes: number;
}
