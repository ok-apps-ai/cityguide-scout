import { useEffect, useRef } from "react";
import { useMap, useMapsLibrary } from "@vis.gl/react-google-maps";

import type { ICity } from "../types";

interface ICityGridProps {
  city: ICity;
}

const GRID_STEP_DEGREES = Number(import.meta.env.VITE_GRID_STEP_DEGREES ?? 0.02);

export const CityGrid = (props: ICityGridProps) => {
  const { city } = props;
  const map = useMap();
  const mapsLib = useMapsLibrary("maps");
  const linesRef = useRef<google.maps.Polyline[]>([]);

  useEffect(() => {
    if (!map || !mapsLib) return;

    const coords = city.boundary.coordinates[0];
    const lngs = coords.map(([lng]) => lng);
    const lats = coords.map(([, lat]) => lat);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const lines: google.maps.Polyline[] = [];

    const lineOptions = {
      strokeColor: "#6b7280",
      strokeOpacity: 0.35,
      strokeWeight: 1,
      map,
    };

    for (let lat = minLat; lat <= maxLat + GRID_STEP_DEGREES / 2; lat += GRID_STEP_DEGREES) {
      lines.push(
        new mapsLib.Polyline({
          path: [
            { lat, lng: minLng },
            { lat, lng: maxLng },
          ],
          ...lineOptions,
        }),
      );
    }

    for (let lng = minLng; lng <= maxLng + GRID_STEP_DEGREES / 2; lng += GRID_STEP_DEGREES) {
      lines.push(
        new mapsLib.Polyline({
          path: [
            { lat: minLat, lng },
            { lat: maxLat, lng },
          ],
          ...lineOptions,
        }),
      );
    }

    linesRef.current = lines;

    return () => {
      lines.forEach(l => l.setMap(null));
      linesRef.current = [];
    };
  }, [map, mapsLib, city]);

  return null;
};
