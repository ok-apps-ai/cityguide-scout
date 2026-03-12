import { useEffect, useRef, useState } from "react";
import { useMap, useMapsLibrary } from "@vis.gl/react-google-maps";

import type { IRoute } from "../types";
import { RouteMode } from "../route-mode";

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
  /* eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents -- Polyline from @types/google.maps */
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const [directionsPath, setDirectionsPath] = useState<Array<{ lat: number; lng: number }> | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!map || !mapsLib || typeof google === "undefined") return;

    if (!route?.routeGeometryWkt) {
      setDirectionsPath(null);
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }
      return;
    }

    const path = parseLinestringWkt(route.routeGeometryWkt);
    if (path.length < 2) {
      setDirectionsPath(null);
      return;
    }

    const travelMode = (route.routeMode as google.maps.TravelMode) ?? RouteMode.WALKING;
    const id = ++requestIdRef.current;

    const directionsService = new google.maps.DirectionsService();
    const waypoints = path.slice(1, -1).map(p => ({ location: p, stopover: true }));

    directionsService.route(
      {
        origin: path[0],
        destination: path[path.length - 1],
        waypoints,
        travelMode,
      },
      (result, status) => {
        if (id !== requestIdRef.current) return;

        if (status === google.maps.DirectionsStatus.OK && result?.routes?.[0]?.overview_path) {
          const overviewPath = result.routes[0].overview_path;
          const routePath = overviewPath.map((p: google.maps.LatLng) => ({ lat: p.lat(), lng: p.lng() }));
          setDirectionsPath(routePath);
        } else {
          setDirectionsPath(path);
        }
      },
    );
  }, [map, mapsLib, route?.id, route?.routeGeometryWkt, route?.routeMode]);

  useEffect(() => {
    if (!map || !mapsLib) return;

    if (!directionsPath || directionsPath.length < 2) {
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }
      return;
    }

    const polyline = new mapsLib.Polyline({
      path: directionsPath,
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
  }, [map, mapsLib, directionsPath]);

  return null;
};
