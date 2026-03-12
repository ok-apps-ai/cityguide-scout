import { Controller, Logger } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";

import { DEFAULT_ROUTE_GENERATION_OPTIONS, type IRouteOptions } from "./generator.options";
import { ROUTE_GENERATE } from "./generator.patterns";
import { GeneratorService } from "./generator.service";

@Controller()
export class GeneratorController {
  private readonly logger = new Logger(GeneratorController.name);

  constructor(private readonly generatorService: GeneratorService) {}

  @MessagePattern(ROUTE_GENERATE)
  public async generateRoutes(
    @Payload() payload: { cityId: string; options?: Partial<IRouteOptions> },
  ): Promise<{ routeIds: string[] }> {
    const preset: IRouteOptions = {
      ...DEFAULT_ROUTE_GENERATION_OPTIONS,
      ...(payload.options ?? {}),
    };
    this.logger.log(`TCP ${ROUTE_GENERATE}: ${payload.cityId}`, JSON.stringify(preset));
    const routeIds = await this.generatorService.generateForCity(payload.cityId, preset);
    return { routeIds };
  }
}
