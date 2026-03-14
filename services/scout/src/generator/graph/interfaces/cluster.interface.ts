import type { IPlace } from "@framework/types";

export interface ICluster {
  id: number;
  places: IPlace[];
  centroidLat: number;
  centroidLng: number;
  seedPlace: IPlace;
}
