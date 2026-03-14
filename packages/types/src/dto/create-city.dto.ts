import type { ILatLng } from "./lat-lng.interface";

export interface ICreateCityDto {
  name: string;
  northeast: ILatLng;
  southwest: ILatLng;
}

export interface ICreateCityPayload extends ICreateCityDto {}
