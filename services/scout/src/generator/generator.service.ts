import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectDataSource } from "@nestjs/typeorm";
import { EventEmitter2, OnEvent } from "@nestjs/event-emitter";
import { DataSource } from "typeorm";

import type { IRouteOptions } from "@framework/types";

import { CityEntity } from "../city/city.entity";
import { CITY_CREATED_EVENT } from "../city/city.service";
import { PlaceOsmResolutionService } from "../place/place-osm-resolution.service";
import { PlaceService } from "../place/place.service";
import { RouteService } from "../route/route.service";
import { buildRouteGraph } from "./graph/route.graph";
import { RouteGenerationState } from "./graph/state";
import { DEFAULT_ROUTE_GENERATION_OPTIONS } from "./generator.options";

type AnyRecord = Record<string, any>;

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

  public async generateForCity(
    cityId: string,
    preset: IRouteOptions = DEFAULT_ROUTE_GENERATION_OPTIONS,
  ): Promise<string[]> {
    const openaiApiKey = this.configService.get<string>("OPENAI_API_KEY", "");

    const graph = buildRouteGraph({
      placeService: this.placeService,
      placeOsmResolutionService: this.placeOsmResolutionService,
      routeService: this.routeService,
      dataSource: this.dataSource,
      openaiApiKey,
      eventEmitter: this.eventEmitter,
    });

    const initialState: Partial<RouteGenerationState> = {
      cityId,
      routeGenerationOptions: preset,
    };

    const recursionLimit = this.configService.get<number>("ROUTE_GRAPH_RECURSION_LIMIT", 500);
    const result = (await graph.invoke(initialState as AnyRecord, {
      recursionLimit,
    })) as RouteGenerationState;

    this.logger.log(`Route generation complete for city ${cityId}: ${result.savedRoutes.length} routes saved`);
    return result.savedRoutes;
  }
}
