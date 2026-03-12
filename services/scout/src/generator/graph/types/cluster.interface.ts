import type { PlaceEntity } from "../../../place/place.entity";

export interface ICluster {
  id: number;
  places: PlaceEntity[];
  centroidLat: number;
  centroidLng: number;
  seedPlace: PlaceEntity;
}
