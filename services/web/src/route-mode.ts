/** Matches google.maps.TravelMode for Directions API. */
export const RouteMode = {
  WALKING: "WALKING",
  BICYCLING: "BICYCLING",
  DRIVING: "DRIVING",
} as const;

export type RouteMode = (typeof RouteMode)[keyof typeof RouteMode];
