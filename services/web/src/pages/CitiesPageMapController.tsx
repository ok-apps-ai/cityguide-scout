import { useEffect } from "react";
import { useMap } from "@vis.gl/react-google-maps";

import type { ICity, IPendingCity } from "../types";

interface ICitiesPageMapControllerProps {
  selectedCity: ICity | null;
  pendingCity: IPendingCity | null;
}

export const CitiesPageMapController = (props: ICitiesPageMapControllerProps) => {
  const { selectedCity, pendingCity } = props;
  const map = useMap();

  useEffect(() => {
    if (!map || !selectedCity) return;
    const coords = selectedCity.boundary.coordinates[0];
    const bounds = new google.maps.LatLngBounds();
    coords.forEach(([lng, lat]) => bounds.extend({ lat, lng }));
    map.fitBounds(bounds, 60);
  }, [map, selectedCity]);

  useEffect(() => {
    if (!map || !pendingCity) return;
    const bounds = new google.maps.LatLngBounds(
      { lat: pendingCity.southwest.lat, lng: pendingCity.southwest.lng },
      { lat: pendingCity.northeast.lat, lng: pendingCity.northeast.lng },
    );
    map.fitBounds(bounds, 60);
  }, [map, pendingCity]);

  return null;
};
