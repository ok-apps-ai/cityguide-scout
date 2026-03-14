import { PlaceCategory, RouteTheme } from "@framework/types";

export const THEME_CATEGORIES: Record<RouteTheme, PlaceCategory[]> = {
  [RouteTheme.HISTORY]: [
    PlaceCategory.TOURIST_ATTRACTION,
    PlaceCategory.CHURCH,
    PlaceCategory.MUSEUM,
    PlaceCategory.PLACE_OF_WORSHIP,
    PlaceCategory.POINT_OF_INTEREST,
    PlaceCategory.MONUMENT,
    PlaceCategory.SQUARE,
  ],
  [RouteTheme.NATURE]: [PlaceCategory.PARK, PlaceCategory.NATURAL_FEATURE, PlaceCategory.HIKING_AREA],
  [RouteTheme.VIEWPOINTS]: [
    PlaceCategory.TOURIST_ATTRACTION,
    PlaceCategory.NATURAL_FEATURE,
    PlaceCategory.POINT_OF_INTEREST,
    PlaceCategory.VIEWPOINT,
    PlaceCategory.SQUARE,
  ],
  [RouteTheme.SHOPPING]: [
    PlaceCategory.SHOPPING_MALL,
    PlaceCategory.STORE,
    PlaceCategory.STREET,
    PlaceCategory.SQUARE,
    PlaceCategory.POINT_OF_INTEREST,
  ],
  [RouteTheme.EVENING]: [
    PlaceCategory.TOURIST_ATTRACTION,
    PlaceCategory.AMUSEMENT_PARK,
    PlaceCategory.POINT_OF_INTEREST,
    PlaceCategory.SHOPPING_MALL,
    PlaceCategory.SQUARE,
    PlaceCategory.STREET,
  ],
  [RouteTheme.HIGHLIGHTS]: [
    PlaceCategory.MUSEUM,
    PlaceCategory.TOURIST_ATTRACTION,
    PlaceCategory.CHURCH,
    PlaceCategory.ART_GALLERY,
    PlaceCategory.POINT_OF_INTEREST,
    PlaceCategory.MONUMENT,
    PlaceCategory.SQUARE,
    PlaceCategory.VIEWPOINT,
  ],
};
