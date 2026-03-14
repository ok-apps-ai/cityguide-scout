import { Controller, Logger } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";

import { ROUTE_GENERATE } from "./generator.patterns";
import { GeneratorService } from "./generator.service";

@Controller()
export class GeneratorController {
  private readonly logger = new Logger(GeneratorController.name);

  constructor(private readonly generatorService: GeneratorService) {}

  @MessagePattern(ROUTE_GENERATE)
  public async generateRoutes(@Payload() payload: { cityId: string }): Promise<{ routeIds: string[] }> {
    this.logger.log(`TCP ${ROUTE_GENERATE}: ${payload.cityId}`);
    const routeIds = await this.generatorService.generateForCity(payload.cityId);
    return { routeIds };
  }
}
