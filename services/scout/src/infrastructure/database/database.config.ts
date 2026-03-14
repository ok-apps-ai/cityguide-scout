import { SnakeNamingStrategy } from "typeorm-naming-strategies";
import { PostgresConnectionOptions } from "typeorm/driver/postgres/PostgresConnectionOptions";

import { CityEntity } from "../../city/city.entity";
import { PlaceEntity } from "../../place/place.entity";
import { RouteEntity } from "../../route/route.entity";
import { RouteStopEntity } from "../../route/route-stop.entity";
import { ns } from "../../common/constants";
import { CreateSchema1773218676204 } from "../../migrations/1773218676204-CreateSchema";
import { CreatePostgisExtension1773218681204 } from "../../migrations/1773218681204-CreatePostgisExtension";
import { CreateCitiesTable1773218686204 } from "../../migrations/1773218686204-CreateCitiesTable";
import { CreatePlacesTable1773218691204 } from "../../migrations/1773218691204-CreatePlacesTable";
import { CreateRoutesTable1773218696204 } from "../../migrations/1773218696204-CreateRoutesTable";
import { CreateRouteStopsTable1773218701204 } from "../../migrations/1773218701204-CreateRouteStopsTable";
import { AddPhotoNameToPlaces1773218711204 } from "../../migrations/1773218711204-AddPhotoNameToPlaces";
import { AddGenerationOptionsToRoutes1773218716204 } from "../../migrations/1773218716204-AddGenerationOptionsToRoutes";

const config: PostgresConnectionOptions = {
  name: "default",
  type: "postgres",
  entities: [CityEntity, PlaceEntity, RouteEntity, RouteStopEntity],
  synchronize: false,
  migrationsRun: true,
  migrationsTableName: ns,
  migrationsTransactionMode: "each",
  namingStrategy: new SnakeNamingStrategy(),
  logging: process.env.LOG_MODE === "true",
  migrations: [
    CreateSchema1773218676204,
    CreatePostgisExtension1773218681204,
    CreateCitiesTable1773218686204,
    CreatePlacesTable1773218691204,
    CreateRoutesTable1773218696204,
    CreateRouteStopsTable1773218701204,
    AddPhotoNameToPlaces1773218711204,
    AddGenerationOptionsToRoutes1773218716204,
  ],
};

export default config;
