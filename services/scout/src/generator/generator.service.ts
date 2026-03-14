import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectDataSource } from "@nestjs/typeorm";
import { EventEmitter2, OnEvent } from "@nestjs/event-emitter";
import { DataSource } from "typeorm";

import { CityEntity } from "../city/city.entity";
import { CITY_CREATED_EVENT } from "../city/city.service";
import { PlaceOsmResolutionService } from "../place/place-osm-resolution.service";
import { PlaceService } from "../place/place.service";
import { RouteService } from "../route/route.service";
import {
  WALKING_ROUTE_GENERATION_OPTIONS,
  // BICYCLING_ROUTE_GENERATION_OPTIONS,
  // DRIVING_ROUTE_GENERATION_OPTIONS,
} from "./route-presets";
import { buildRouteGraph } from "./graph/route.graph";
import { RouteGenerationState } from "./graph/state";

type AnyRecord = Record<string, any>;

const ROUTE_PRESETS = [
  WALKING_ROUTE_GENERATION_OPTIONS,
  // BICYCLING_ROUTE_GENERATION_OPTIONS,
  // DRIVING_ROUTE_GENERATION_OPTIONS,
];

@Injectable()
export class GeneratorService {
  private readonly logger = new Logger(GeneratorService.name);

  constructor(
    private readonly placeService: PlaceService,
    private readonly placeOsmResolutionService: PlaceOsmResolutionService,
    private readonly routeService: RouteService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  @OnEvent(CITY_CREATED_EVENT)
  public async onCityCreated(cityEntity: CityEntity): Promise<void> {
    this.logger.log(`city.created event received for: ${cityEntity.name} — starting route generation`);
    await this.generateForCity(cityEntity.id);
  }

  public async generateForCity(cityId: string): Promise<string[]> {
    const openaiApiKey = this.configService.get<string>("OPENAI_API_KEY", "");
    const recursionLimit = this.configService.get<number>("ROUTE_GRAPH_RECURSION_LIMIT", 500);

    const graph = buildRouteGraph({
      placeService: this.placeService,
      placeOsmResolutionService: this.placeOsmResolutionService,
      routeService: this.routeService,
      dataSource: this.dataSource,
      openaiApiKey,
      eventEmitter: this.eventEmitter,
    });

    const allSaved: string[] = [];
    for (const preset of ROUTE_PRESETS) {
      const initialState: Partial<RouteGenerationState> = {
        cityId,
        routeGenerationOptions: preset,
      };
      const result = (await graph.invoke(initialState as AnyRecord, {
        recursionLimit,
      })) as RouteGenerationState;
      allSaved.push(...result.savedRoutes);
    }

    this.logger.log(`Route generation complete for city ${cityId}: ${allSaved.length} routes saved`);
    return allSaved;
  }
}
