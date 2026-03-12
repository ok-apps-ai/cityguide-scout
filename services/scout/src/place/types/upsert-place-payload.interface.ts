import type { PlaceCategory, PlaceSource, PriceLevel } from "../place.entity";

export interface IUpsertPlacePayload {
  cityId: string;
  name: string;
  lat: number;
  lng: number;
  source: PlaceSource;
  category: PlaceCategory;
  googlePlaceId?: string | null;
  osmId?: string | null;
  geomExpression?: string;
  types?: string[];
  rating?: number | null;
  reviewCount?: number | null;
  priceLevel?: PriceLevel | null;
  visitDurationMinutes?: number | null;
  description?: string | null;
}
