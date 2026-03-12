import { PlaceCategory } from "../place/place.entity";
import { RouteTheme } from "../route/route.entity";

/** Theme-specific base weights. Higher = more preferred for that theme. */
export const THEME_CATEGORY_WEIGHTS: Record<RouteTheme, Partial<Record<PlaceCategory, number>>> = {
  [RouteTheme.HISTORY]: {
    [PlaceCategory.MUSEUM]: 10,
    [PlaceCategory.CHURCH]: 9,
    [PlaceCategory.MONUMENT]: 9,
    [PlaceCategory.TOURIST_ATTRACTION]: 8,
    [PlaceCategory.PLACE_OF_WORSHIP]: 7,
    [PlaceCategory.POINT_OF_INTEREST]: 6,
    [PlaceCategory.SQUARE]: 5,
  },
  [RouteTheme.SHOPPING]: {
    [PlaceCategory.SHOPPING_MALL]: 8,
    [PlaceCategory.SQUARE]: 7,
    [PlaceCategory.STREET]: 5,
    [PlaceCategory.STORE]: 4,
    [PlaceCategory.POINT_OF_INTEREST]: 3,
  },
  [RouteTheme.NATURE]: {
    [PlaceCategory.PARK]: 8,
    [PlaceCategory.NATURAL_FEATURE]: 8,
    [PlaceCategory.HIKING_AREA]: 7,
  },
  [RouteTheme.VIEWPOINTS]: {
    [PlaceCategory.VIEWPOINT]: 9,
    [PlaceCategory.TOURIST_ATTRACTION]: 8,
    [PlaceCategory.NATURAL_FEATURE]: 7,
    [PlaceCategory.POINT_OF_INTEREST]: 6,
    [PlaceCategory.SQUARE]: 5,
  },
  [RouteTheme.EVENING]: {
    [PlaceCategory.SQUARE]: 8,
    [PlaceCategory.AMUSEMENT_PARK]: 8,
    [PlaceCategory.TOURIST_ATTRACTION]: 7,
    [PlaceCategory.POINT_OF_INTEREST]: 6,
    [PlaceCategory.SHOPPING_MALL]: 5,
    [PlaceCategory.STREET]: 5,
  },
  [RouteTheme.HIGHLIGHTS]: {
    [PlaceCategory.MUSEUM]: 10,
    [PlaceCategory.TOURIST_ATTRACTION]: 9,
    [PlaceCategory.CHURCH]: 8,
    [PlaceCategory.ART_GALLERY]: 8,
    [PlaceCategory.MONUMENT]: 8,
    [PlaceCategory.VIEWPOINT]: 7,
    [PlaceCategory.POINT_OF_INTEREST]: 6,
    [PlaceCategory.SQUARE]: 5,
  },
};
