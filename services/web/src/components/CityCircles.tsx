import { useEffect, useRef } from "react";
import { useMap, useMapsLibrary } from "@vis.gl/react-google-maps";

import type { ICity } from "../types";

interface ICityCirclesProps {
  city: ICity;
}

const GRID_STEP_DEGREES = Number(import.meta.env.VITE_GRID_STEP_DEGREES ?? 0.02);
const NEARBY_RADIUS_METERS = 1500;

export const CityCircles = (props: ICityCirclesProps) => {
  const { city } = props;
  const map = useMap();
  const mapsLib = useMapsLibrary("maps");
  const circlesRef = useRef<google.maps.Circle[]>([]);

  useEffect(() => {
    if (!map || !mapsLib) return;

    const coords = city.boundary.coordinates[0];
    const lngs = coords.map(([lng]) => lng);
    const lats = coords.map(([, lat]) => lat);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const gridStep = GRID_STEP_DEGREES;
    const half = gridStep / 2;
    const centers: Array<{ lat: number; lng: number }> = [];

    for (let lat = minLat + half; lat < maxLat; lat += gridStep) {
      for (let lng = minLng + half; lng < maxLng; lng += gridStep) {
        centers.push({ lat, lng });
      }
    }

    if (centers.length === 0) {
      centers.push({
        lat: (minLat + maxLat) / 2,
        lng: (minLng + maxLng) / 2,
      });
    }

    const circles: google.maps.Circle[] = centers.map(
      center =>
        new mapsLib.Circle({
          center,
          radius: NEARBY_RADIUS_METERS,
          strokeColor: "#6b7280",
          strokeOpacity: 0.35,
          strokeWeight: 1,
          fillColor: "#6b7280",
          fillOpacity: 0.1,
          map,
        }),
    );

    circlesRef.current = circles;

    return () => {
      circles.forEach(c => c.setMap(null));
      circlesRef.current = [];
    };
  }, [map, mapsLib, city]);

  return null;
};
