import { Controller, Logger } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";

import { RouteService } from "./route.service";
import { ROUTE_FIND_BY_CITY } from "./route.patterns";

@Controller()
export class RouteController {
  private readonly logger = new Logger(RouteController.name);

  constructor(private readonly routeService: RouteService) {}

  @MessagePattern(ROUTE_FIND_BY_CITY)
  public async findByCityId(@Payload() payload: { cityId: string; routeMode?: string }) {
    this.logger.log(`TCP ${ROUTE_FIND_BY_CITY}: ${payload.cityId}${payload.routeMode ? ` routeMode=${payload.routeMode}` : ""}`);
    return this.routeService.findRoutesForApi(payload.cityId, payload.routeMode);
  }
}
