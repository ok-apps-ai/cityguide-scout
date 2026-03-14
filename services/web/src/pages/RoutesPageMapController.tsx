import { useEffect } from "react";
import { useMap } from "@vis.gl/react-google-maps";

import type { IRoute } from "../types";

const parseLinestringWkt = (wkt: string): Array<{ lat: number; lng: number }> => {
  const match = /LINESTRING\s*\((.+)\)/i.exec(wkt);
  if (!match) return [];
  return match[1].split(",").map(part => {
    const [lng, lat] = part.trim().split(/\s+/).map(Number);
    return { lat, lng };
  });
};

interface IRoutesPageMapControllerProps {
  selectedRoute: IRoute | null;
}

export const RoutesPageMapController = (props: IRoutesPageMapControllerProps) => {
  const { selectedRoute } = props;
  const map = useMap();

  useEffect(() => {
    if (!map || !selectedRoute?.routeGeometryWkt) return;
    const path = parseLinestringWkt(selectedRoute.routeGeometryWkt);
    if (path.length < 2) return;
    const bounds = new google.maps.LatLngBounds();
    path.forEach(p => bounds.extend(p));
    map.fitBounds(bounds, 60);
  }, [map, selectedRoute]);

  return null;
};
