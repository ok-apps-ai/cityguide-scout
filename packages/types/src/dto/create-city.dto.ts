import type { ILatLng } from "./lat-lng.interface";

export interface ICreateCityPayload {
  name: string;
  northeast: ILatLng;
  southwest: ILatLng;
}
