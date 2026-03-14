import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { CityEntity } from "./city.entity";

const defaultValues = {
  name: "Vatican City",
  boundary: (() =>
    "ST_GeomFromText('POLYGON((12.4457 41.9002, 12.4584 41.9002, 12.4584 41.9074, 12.4457 41.9074, 12.4457 41.9002))', 4326)") as () => string,
};

@Injectable()
export class CitySeedService {
  constructor(
    @InjectRepository(CityEntity)
    private readonly cityEntityRepository: Repository<CityEntity>,
  ) {}

  public async seedCity(overrides: Partial<CityEntity> = {}): Promise<CityEntity> {
    const values = Object.assign({}, defaultValues, overrides);

    const result = await this.cityEntityRepository
      .createQueryBuilder()
      .insert()
      .into(CityEntity)
      .values(values)
      .execute();

    const id = result.identifiers[0]?.id;
    if (!id) {
      throw new Error("City insert did not return identifier");
    }
    return this.cityEntityRepository.findOneOrFail({ where: { id } });
  }
}
