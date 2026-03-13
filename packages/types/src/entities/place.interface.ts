import type { PlaceCategory, PlaceSource, PriceLevel } from "./enums";

export interface IPlace {
  id: string;
  cityId: string;
  name: string;
  geom: string;
  googlePlaceId: string | null;
  source: PlaceSource;
  osmId: string | null;
  category: PlaceCategory;
  types: string[];
  rating: number | null;
  reviewCount: number | null;
  priceLevel: PriceLevel | null;
  visitDurationMinutes: number | null;
  description: string | null;
  mediaUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}
