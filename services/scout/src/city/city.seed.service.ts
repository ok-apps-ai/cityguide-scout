import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { ns } from "../common/constants";
import { CityEntity } from "./city.entity";

@Injectable()
export class CitySeedService {
  constructor(
    @InjectRepository(CityEntity)
    private readonly cityEntityRepository: Repository<CityEntity>,
  ) {}

  public async seedCity(
    overrides: { name?: string; swLng?: number; swLat?: number; neLng?: number; neLat?: number } = {},
  ): Promise<CityEntity> {
    const name = overrides.name ?? "Vatican City";
    const swLng = overrides.swLng ?? 12.4457;
    const swLat = overrides.swLat ?? 41.9002;
    const neLng = overrides.neLng ?? 12.4584;
    const neLat = overrides.neLat ?? 41.9074;

    const result = await this.cityEntityRepository.manager.query(
      `INSERT INTO ${ns}.cities (name, boundary)
       VALUES ($1, ST_MakeEnvelope($2, $3, $4, $5, 4326))
       RETURNING id`,
      [name, swLng, swLat, neLng, neLat],
    );

    return this.cityEntityRepository.findOneOrFail({ where: { id: result[0].id } });
  }
}
