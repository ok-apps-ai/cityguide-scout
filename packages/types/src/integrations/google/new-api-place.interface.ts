export interface INewApiPlace {
  id?: string;
  displayName?: { text?: string };
  location?: { latitude?: number; longitude?: number };
  viewport?: {
    high?: { latitude?: number; longitude?: number };
    low?: { latitude?: number; longitude?: number };
  };
  types?: string[];
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
}
