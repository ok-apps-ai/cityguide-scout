import { useEffect, useRef } from "react";
import { useMap, useMapsLibrary } from "@vis.gl/react-google-maps";

import type { IRoute } from "../types";

interface IRoutePolylineProps {
  route: IRoute | null;
}

/**
 * Parses WKT LINESTRING to array of {lat, lng}.
 * LINESTRING(lng1 lat1, lng2 lat2, ...)
 */
const parseLinestringWkt = (wkt: string): Array<{ lat: number; lng: number }> => {
  const match = /LINESTRING\s*\((.+)\)/i.exec(wkt);
  if (!match) return [];

  return match[1].split(",").map(part => {
    const [lng, lat] = part.trim().split(/\s+/).map(Number);
    return { lat, lng };
  });
};

export const RoutePolyline = (props: IRoutePolylineProps) => {
  const { route } = props;
  const map = useMap();
  const mapsLib = useMapsLibrary("maps");
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map || !mapsLib) return;

    if (!route?.routeGeometryWkt) {
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }
      return;
    }

    const path = parseLinestringWkt(route.routeGeometryWkt);
    if (path.length < 2) return;

    const polyline = new mapsLib.Polyline({
      path,
      strokeColor: "#1a73e8",
      strokeOpacity: 1,
      strokeWeight: 4,
      map,
    });

    polylineRef.current = polyline;

    return () => {
      polyline.setMap(null);
      polylineRef.current = null;
    };
  }, [map, mapsLib, route?.id, route?.routeGeometryWkt]);

  return null;
};
