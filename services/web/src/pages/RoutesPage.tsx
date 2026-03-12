import { useCallback, useEffect, useState } from "react";
import { APIProvider, Map, useMap } from "@vis.gl/react-google-maps";

import type { ICity, IRoute } from "../types";
import { RoutePolyline } from "../components/RoutePolyline";
import { RouteMarkers } from "../components/RouteMarkers";
import { RoutesPanel } from "../components/RoutesPanel";
import { useCities } from "../hooks/useCities";

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY as string;
const DEFAULT_CENTER = { lat: 48.3794, lng: 31.1656 };
const DEFAULT_ZOOM = 5;

const parseLinestringWkt = (wkt: string): Array<{ lat: number; lng: number }> => {
  const match = /LINESTRING\s*\((.+)\)/i.exec(wkt);
  if (!match) return [];
  return match[1].split(",").map(part => {
    const [lng, lat] = part.trim().split(/\s+/).map(Number);
    return { lat, lng };
  });
};

const MapController = (props: { selectedRoute: IRoute | null }) => {
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

export const RoutesPage = () => {
  const { data: cities = [], isPending, error } = useCities();
  const [selectedRoute, setSelectedRoute] = useState<IRoute | null>(null);

  const handleCitySelect = useCallback((_city: ICity | null) => {
    /* no-op: required by onCitySelect interface */
  }, []);

  const handleRouteSelect = useCallback((route: IRoute | null) => {
    setSelectedRoute(route);
  }, []);

  return (
    <APIProvider apiKey={GOOGLE_API_KEY}>
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <RoutesPanel
          cities={cities}
          isCitiesPending={isPending}
          citiesError={error}
          onCitySelect={handleCitySelect}
          onRouteSelect={handleRouteSelect}
        />

        <main className="flex-1 h-full relative overflow-hidden">
          <Map
            defaultCenter={DEFAULT_CENTER}
            defaultZoom={DEFAULT_ZOOM}
            gestureHandling="greedy"
            style={{ width: "100%", height: "100%" }}
          >
            <MapController selectedRoute={selectedRoute} />
            <RoutePolyline route={selectedRoute} />
            <RouteMarkers route={selectedRoute} />
          </Map>
        </main>
      </div>
    </APIProvider>
  );
};
