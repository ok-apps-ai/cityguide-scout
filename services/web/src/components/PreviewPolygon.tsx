import { useEffect, useRef } from "react";
import { useMap, useMapsLibrary } from "@vis.gl/react-google-maps";

import type { ILatLng } from "../types";

interface IPreviewPolygonProps {
  northeast: ILatLng;
  southwest: ILatLng;
}

export const PreviewPolygon = (props: IPreviewPolygonProps) => {
  const { northeast: ne, southwest: sw } = props;
  const map = useMap();
  const mapsLib = useMapsLibrary("maps");
  const polygonRef = useRef<google.maps.Polygon | null>(null);

  useEffect(() => {
    if (!map || !mapsLib) return;

    const paths = [
      { lat: sw.lat, lng: sw.lng },
      { lat: sw.lat, lng: ne.lng },
      { lat: ne.lat, lng: ne.lng },
      { lat: ne.lat, lng: sw.lng },
      { lat: sw.lat, lng: sw.lng },
    ];

    const polygon = new mapsLib.Polygon({
      paths,
      strokeColor: "#1a73e8",
      strokeOpacity: 0.9,
      strokeWeight: 2,
      fillColor: "#1a73e8",
      fillOpacity: 0.1,
      map,
    });

    polygonRef.current = polygon;

    return () => {
      polygon.setMap(null);
      polygonRef.current = null;
    };
  }, [map, mapsLib, ne.lat, ne.lng, sw.lat, sw.lng]);

  return null;
};
