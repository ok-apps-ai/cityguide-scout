import { PlaceCategory } from "./place.entity";

/**
 * Typical visit duration by POI type (minutes).
 * Viewpoint/Monument ~10, Church ~20, Museum 60–90, Park ~30, Tourist street 20–40.
 */
export const PLACE_VISIT_DURATION: Record<PlaceCategory, number> = {
  [PlaceCategory.TOURIST_ATTRACTION]: 10,
  [PlaceCategory.NATURAL_FEATURE]: 10,
  [PlaceCategory.POINT_OF_INTEREST]: 10,
  [PlaceCategory.VIEWPOINT]: 10,
  [PlaceCategory.MONUMENT]: 10,
  [PlaceCategory.CHURCH]: 20,
  [PlaceCategory.PLACE_OF_WORSHIP]: 20,
  [PlaceCategory.MUSEUM]: 75,
  [PlaceCategory.ART_GALLERY]: 75,
  [PlaceCategory.PARK]: 30,
  [PlaceCategory.SHOPPING_MALL]: 30,
  [PlaceCategory.STORE]: 30,
  [PlaceCategory.STREET]: 30,
  [PlaceCategory.SQUARE]: 30,
  [PlaceCategory.AMUSEMENT_PARK]: 120,
  [PlaceCategory.HIKING_AREA]: 60,
};
