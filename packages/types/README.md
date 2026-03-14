# @framework/types

TypeScript interfaces shared between microservices (server, scout).

- **entities/** — Entity shapes (ICity, IPlace, IRoute, IRouteStop) and enums (PlaceCategory, PlaceSource, PriceLevel, RouteMode, RouteTheme)
- **dto/** — DTO interfaces (suffix `Dto`, e.g. ICreateCityDto, IFindRoutesDto) and payload interfaces (suffix `Payload`, e.g. ICreateCityPayload, IUpsertPlacePayload, ICreateRoutePayload)
- **integrations/** — Google Places and OSM Overpass API types

Build this package whenever it changes so apps consume updated types: `npm run build` from repo root.
