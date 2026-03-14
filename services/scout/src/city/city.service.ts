import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import type { ICreateCityPayload, IDeleteCityPayload } from "@framework/types";

import { CollectorService } from "../collector/collector.service";
import { ns } from "../common/constants";
import { CityEntity } from "./city.entity";

export const CITY_CREATED_EVENT = "city.created";

@Injectable()
export class CityService {
  private readonly logger = new Logger(CityService.name);

  constructor(
    @InjectRepository(CityEntity)
    private readonly cityEntityRepository: Repository<CityEntity>,
    private readonly collectorService: CollectorService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  public async findOne(id: string): Promise<CityEntity | null> {
    return this.cityEntityRepository.findOne({ where: { id } });
  }

  public async findAll(): Promise<Array<{ id: string; name: string; boundary: object }>> {
    const rows: Array<{ id: string; name: string; boundary: object }> = await this.cityEntityRepository.query(
      `SELECT id::text, name, ST_AsGeoJSON(boundary)::json AS boundary FROM ${ns}.cities ORDER BY created_at ASC`,
    );
    return rows;
  }

  public async create(payload: ICreateCityPayload): Promise<{ id: string }> {
    const { name, northeast: ne, southwest: sw } = payload;

    const result = await this.cityEntityRepository.query(
      `INSERT INTO ${ns}.cities (name, boundary)
       VALUES ($1, ST_MakeEnvelope($2, $3, $4, $5, 4326))
       RETURNING id`,
      [name, sw.lng, sw.lat, ne.lng, ne.lat],
    );

    const id: string = result[0].id;
    this.logger.log(`City created: ${id} (${name})`);

    const cityEntity = await this.cityEntityRepository.findOneOrFail({ where: { id } });

    await this.collectorService.collectPointsForCity(cityEntity);
    await this.eventEmitter.emitAsync(CITY_CREATED_EVENT, cityEntity);

    return { id };
  }

  public async delete(payload: IDeleteCityPayload): Promise<void> {
    const { id } = payload;
    await this.cityEntityRepository.delete({ id });
    this.logger.log(`City deleted: ${id}`);
  }
}
