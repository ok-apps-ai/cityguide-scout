import { useEffect, useRef } from "react";
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

// Start: green circle with play triangle
const START_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <circle cx="12" cy="12" r="10" fill="#22c55e" stroke="#15803d" stroke-width="2"/>
  <path d="M10 8l6 4-6 4V8z" fill="white"/>
</svg>`;

// End: red circle with stop square
const END_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <circle cx="12" cy="12" r="10" fill="#ef4444" stroke="#b91c1c" stroke-width="2"/>
  <rect x="9" y="9" width="6" height="6" fill="white" rx="1"/>
</svg>`;

const PIN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#3b82f6" stroke="#1d4ed8" stroke-width="1"/>
</svg>`;

const toDataUrl = (svg: string): string => `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;

const escapeHtml = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");

const getStopInfo = (
  index: number,
  isStart: boolean,
  isEnd: boolean,
  stops: IRoute["stops"] | undefined,
): { title: string; description: string } => {
  const stop = stops?.[index];
  const role = isStart ? "Start" : isEnd ? "End" : `Stop ${index + 1}`;
  const title = stop?.placeName ?? role;
  const description = stop?.placeDescription ?? "";
  return { title, description };
};

interface IRouteMarkersProps {
  route: IRoute | null;
}

export const RouteMarkers = (props: IRouteMarkersProps) => {
  const { route } = props;
  const map = useMap();
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  useEffect(() => {
    if (!map || typeof google === "undefined") return;

    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];
    if (infoWindowRef.current) {
      infoWindowRef.current.close();
      infoWindowRef.current = null;
    }

    if (!route?.routeGeometryWkt) return;

    const path = parseLinestringWkt(route.routeGeometryWkt);
    if (path.length < 2) return;

    const stops = route.stops ?? [];
    const infoWindow = new google.maps.InfoWindow();
    infoWindowRef.current = infoWindow;

    const markers: google.maps.Marker[] = [];

    path.forEach((point, i) => {
      const isStart = i === 0;
      const isEnd = i === path.length - 1;
      const svg = isStart ? START_SVG : isEnd ? END_SVG : PIN_SVG;
      const size = isStart || isEnd ? 28 : 22;
      const anchorY = isStart || isEnd ? size / 2 : size;
      const { title, description } = getStopInfo(i, isStart, isEnd, stops.length > 0 ? stops : undefined);

      const marker = new google.maps.Marker({
        position: point,
        map,
        icon: {
          url: toDataUrl(svg),
          scaledSize: new google.maps.Size(size, size),
          anchor: new google.maps.Point(size / 2, anchorY),
        },
        title,
      });

      marker.addListener("mouseover", () => {
        const descHtml = description
          ? `<p style="margin:8px 0 0;color:#555;font-size:13px">${escapeHtml(description)}</p>`
          : "";
        infoWindow.setContent(
          `<div style="padding:12px;font-family:sans-serif;font-size:14px;max-width:280px;line-height:1.5">
            <strong style="font-size:15px">${escapeHtml(title)}</strong>
            ${descHtml}
          </div>`,
        );
        infoWindow.open(map, marker);
      });

      marker.addListener("mouseout", () => {
        infoWindow.close();
      });

      markers.push(marker);
    });

    markersRef.current = markers;

    return () => {
      markers.forEach(m => google.maps.event.clearInstanceListeners(m));
      markers.forEach(m => m.setMap(null));
      markersRef.current = [];
      infoWindow.close();
      infoWindowRef.current = null;
    };
  }, [map, route?.id, route?.routeGeometryWkt, route?.stops]);

  return null;
};
