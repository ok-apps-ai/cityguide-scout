import type { PlaceEntity } from "../../../place/place.entity";

export interface IRouteStop {
  place: PlaceEntity;
  orderIndex: number;
  visitDurationMinutes: number;
}
