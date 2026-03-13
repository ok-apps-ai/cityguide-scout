export interface IRouteStop {
  id: string;
  routeId: string;
  placeId: string;
  orderIndex: number;
  visitDurationMinutes: number | null;
}
