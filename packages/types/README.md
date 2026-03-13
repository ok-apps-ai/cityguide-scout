# @framework/types

TypeScript interfaces shared between microservices (server, scout).

- **entities/** — Entity shapes (ICity, IPlace, IRoute, IRouteStop) and enums (PlaceCategory, PlaceSource, PriceLevel, RouteMode, RouteTheme)
- **dto/** — DTO/payload interfaces (ICreateCityPayload, IUpsertPlacePayload, ICreateRoutePayload, IRouteOptions, etc.)
- **integrations/** — Google Places and OSM Overpass API types

Build this package whenever it changes so apps consume updated types: `npm run build` from repo root.
