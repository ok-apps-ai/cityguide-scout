import { useEffect, useRef } from "react";
import { useMap, useMapsLibrary } from "@vis.gl/react-google-maps";

import type { ICity } from "../types";

interface ICityPolygonProps {
  city: ICity;
  isSelected: boolean;
  onClick: () => void;
}

export const CityPolygon = (props: ICityPolygonProps) => {
  const { city, isSelected, onClick } = props;
  const map = useMap();
  const mapsLib = useMapsLibrary("maps");
  const polygonRef = useRef<google.maps.Polygon | null>(null);
  const onClickRef = useRef(onClick);

  useEffect(() => {
    onClickRef.current = onClick;
  }, [onClick]);

  useEffect(() => {
    if (!map || !mapsLib) return;

    const coordinates = city.boundary.coordinates[0].map(([lng, lat]) => ({ lat, lng }));

    const polygon = new mapsLib.Polygon({
      paths: coordinates,
      strokeColor: "#34a853",
      strokeOpacity: 1,
      strokeWeight: 2,
      fillColor: "#34a853",
      fillOpacity: 0.1,
      map,
    });

    const listener = polygon.addListener("click", () => onClickRef.current());
    polygonRef.current = polygon;

    return () => {
      google.maps.event.removeListener(listener);
      polygon.setMap(null);
      polygonRef.current = null;
    };
  }, [map, mapsLib, city]);

  useEffect(() => {
    if (!polygonRef.current) return;
    polygonRef.current.setOptions({
      strokeColor: isSelected ? "#1a73e8" : "#34a853",
      strokeWeight: isSelected ? 3 : 2,
      fillColor: isSelected ? "#1a73e8" : "#34a853",
      fillOpacity: isSelected ? 0.2 : 0.1,
    });
  }, [isSelected]);

  return null;
};
