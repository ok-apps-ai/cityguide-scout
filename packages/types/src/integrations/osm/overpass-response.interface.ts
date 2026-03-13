import type { IOverpassElement } from "./overpass-element.interface";

export interface IOverpassResponse {
  version: number;
  generator: string;
  elements: IOverpassElement[];
}
