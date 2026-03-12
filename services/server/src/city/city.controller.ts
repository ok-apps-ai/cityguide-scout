import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Inject, Logger, Param, Post } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { firstValueFrom } from "rxjs";

import { CreateCityDto } from "./create-city.dto";
import { FindRoutesDto } from "./find-routes.dto";
import { SCOUT_SERVICE } from "./city.constants";
import { CITY_CREATE, CITY_DELETE, CITY_FIND_ALL } from "./city.patterns";
import { ROUTE_FIND_BY_CITY, ROUTE_GENERATE } from "../route/route.patterns";

export interface ICityListItem {
  id: string;
  name: string;
  boundary: object;
}

export interface IRouteStop {
  orderIndex: number;
  placeName: string;
  placeDescription: string | null;
  mediaUrl: string | null;
}

export interface IRouteListItem {
  id: string;
  name: string;
  theme: string;
  routeMode: string;
  durationMinutes: number;
  distanceKm: number;
  priceLevel: string;
  routeGeometryWkt: string;
  stops: IRouteStop[];
}

@ApiTags("cities")
@Controller("/cities")
export class CityController {
  private readonly logger = new Logger(CityController.name);

  constructor(@Inject(SCOUT_SERVICE) private readonly scoutClient: ClientProxy) {}

  private async send<T>(pattern: string, payload: object): Promise<T> {
    return firstValueFrom(this.scoutClient.send<T>(pattern, payload));
  }

  @Get("/")
  @ApiOperation({ summary: "List all cities with their boundaries" })
  public async findAll(): Promise<ICityListItem[]> {
    return this.send<ICityListItem[]>(CITY_FIND_ALL, {});
  }

  @Post("/")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Register a city and trigger POI collection + route generation" })
  public async create(@Body() dto: CreateCityDto): Promise<{ id: string }> {
    const { name, northeast, southwest } = dto;
    this.logger.log(`Creating city: ${name}`);
    return this.send<{ id: string }>(CITY_CREATE, { name, northeast, southwest });
  }

  @Delete("/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete a city and all its associated data" })
  public async delete(@Param("id") id: string): Promise<void> {
    this.logger.log(`Deleting city: ${id}`);
    await this.send<{ deleted: boolean }>(CITY_DELETE, { id });
  }

  @Post("/:id/routes")
  @ApiOperation({ summary: "List routes for a city, optionally filtered by route mode" })
  public async findRoutesByCityId(
    @Param("id") cityId: string,
    @Body() dto: FindRoutesDto,
  ): Promise<IRouteListItem[]> {
    const { routeMode } = dto;
    return this.send<IRouteListItem[]>(ROUTE_FIND_BY_CITY, { cityId, routeMode });
  }

  @Post("/:id/generate-routes")
  @ApiOperation({ summary: "Trigger route generation for a city" })
  public async generateRoutes(
    @Param("id") cityId: string,
    @Body() body?: Record<string, unknown>,
  ): Promise<{ routeIds: string[] }> {
    this.logger.log(`Generating routes for city: ${cityId}`);
    return this.send<{ routeIds: string[] }>(ROUTE_GENERATE, { cityId, options: body });
  }
}
