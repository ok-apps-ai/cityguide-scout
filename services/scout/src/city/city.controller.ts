import { Controller, Logger } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";

import { CityService } from "./city.service";
import type { ICreateCityPayload } from "./types";
import { CITY_CREATE, CITY_DELETE, CITY_FIND_ALL } from "./city.patterns";

@Controller()
export class CityController {
  private readonly logger = new Logger(CityController.name);

  constructor(private readonly cityService: CityService) {}

  @MessagePattern(CITY_CREATE)
  public async create(@Payload() payload: ICreateCityPayload): Promise<{ id: string }> {
    this.logger.log(`TCP ${CITY_CREATE}: ${payload.name}`);
    return this.cityService.create(payload);
  }

  @MessagePattern(CITY_FIND_ALL)
  public async findAll(): Promise<Array<{ id: string; name: string; boundary: object }>> {
    return this.cityService.findAll();
  }

  @MessagePattern(CITY_DELETE)
  public async delete(@Payload() payload: { id: string }): Promise<{ deleted: true }> {
    this.logger.log(`TCP ${CITY_DELETE}: ${payload.id}`);
    await this.cityService.delete(payload.id);
    return { deleted: true };
  }
}
