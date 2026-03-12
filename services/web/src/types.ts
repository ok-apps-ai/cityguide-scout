export interface ILatLng {
  lat: number;
  lng: number;
}

export interface IGeoJsonPolygon {
  type: "Polygon";
  coordinates: number[][][];
}

export interface ICity {
  id: string;
  name: string;
  boundary: IGeoJsonPolygon;
}

export interface IPendingCity {
  name: string;
  northeast: ILatLng;
  southwest: ILatLng;
}

export interface IRouteStop {
  orderIndex: number;
  placeName: string;
  placeDescription: string | null;
  mediaUrl: string | null;
}

export interface IRoute {
  id: string;
  name: string;
  theme: string;
  routeMode: string;
  durationMinutes: number;
  distanceKm: number;
  priceLevel: string;
  routeGeometryWkt: string;
  stops?: IRouteStop[];
}
