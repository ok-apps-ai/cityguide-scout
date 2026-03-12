import { PlaceCategory } from "../../../place/place.entity";
import { IWeightedPlace, RouteGenerationState } from "../state";

export const CATEGORY_BASE_WEIGHT: Record<PlaceCategory, number> = {
  [PlaceCategory.MUSEUM]: 10,
  [PlaceCategory.TOURIST_ATTRACTION]: 9,
  [PlaceCategory.ART_GALLERY]: 8,
  [PlaceCategory.CHURCH]: 7,
  [PlaceCategory.PLACE_OF_WORSHIP]: 6,
  [PlaceCategory.AMUSEMENT_PARK]: 7,
  [PlaceCategory.MONUMENT]: 7,
  [PlaceCategory.POINT_OF_INTEREST]: 6,
  [PlaceCategory.PARK]: 6,
  [PlaceCategory.NATURAL_FEATURE]: 6,
  [PlaceCategory.HIKING_AREA]: 6,
  [PlaceCategory.VIEWPOINT]: 7,
  [PlaceCategory.SQUARE]: 6,
  [PlaceCategory.STREET]: 5,
  [PlaceCategory.SHOPPING_MALL]: 5,
  [PlaceCategory.STORE]: 4,
};

export const computeWeightsNode = (state: RouteGenerationState): Promise<Partial<RouteGenerationState>> => {
  const weightedPlaces: IWeightedPlace[] = state.places.map(place => {
    const baseWeight = CATEGORY_BASE_WEIGHT[place.category] ?? 5;
    const ratingBonus = place.rating ? (place.rating / 5) * 4 : 0;
    const popularityBonus = place.reviewCount ? Math.min(Math.log10(place.reviewCount + 1), 4) : 0;
    const weight = baseWeight + ratingBonus + popularityBonus;
    return { place, weight };
  });

  return Promise.resolve({ weightedPlaces });
};
