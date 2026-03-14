import { Test, TestingModule } from "@nestjs/testing";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { CityService } from "./city.service";
import { CityEntity } from "./city.entity";
import { CollectorService } from "../collector/collector.service";

describe("CityService", () => {
  let service: CityService;
  let cityEntityRepository: jest.Mocked<Repository<CityEntity>>;
  let collectorService: CollectorService;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CityService,
        {
          provide: getRepositoryToken(CityEntity),
          useValue: {
            findOne: jest.fn(),
            findOneOrFail: jest.fn(),
            query: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: CollectorService,
          useValue: { collectPointsForCity: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: EventEmitter2,
          useValue: { emitAsync: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    service = module.get(CityService);
    cityEntityRepository = module.get(getRepositoryToken(CityEntity));
    collectorService = module.get(CollectorService);
    eventEmitter = module.get(EventEmitter2);

    jest.clearAllMocks();
  });

  describe("findOne", () => {
    it("returns city when found", async () => {
      const city = { id: "city-1", name: "Vatican City" } as CityEntity;
      cityEntityRepository.findOne.mockResolvedValue(city);

      const result = await service.findOne("city-1");

      expect(result).toEqual(city);
      expect(cityEntityRepository.findOne).toHaveBeenCalledWith({ where: { id: "city-1" } });
    });

    it("returns null when not found", async () => {
      cityEntityRepository.findOne.mockResolvedValue(null);

      const result = await service.findOne("missing-id");

      expect(result).toBeNull();
    });
  });

  describe("findAll", () => {
    it("returns cities with id, name, boundary", async () => {
      const rows = [
        { id: "city-1", name: "Vatican City", boundary: { type: "Polygon" } },
        { id: "city-2", name: "Marbella", boundary: { type: "Polygon" } },
      ];
      cityEntityRepository.query.mockResolvedValue(rows);

      const result = await service.findAll();

      expect(result).toEqual(rows);
      expect(cityEntityRepository.query).toHaveBeenCalled();
    });
  });

  describe("create", () => {
    it("creates city, collects points, emits event, returns id", async () => {
      const createdCity = { id: "city-new", name: "Test City", boundary: {} } as CityEntity;
      cityEntityRepository.query.mockResolvedValue([{ id: "city-new" }]);
      cityEntityRepository.findOneOrFail.mockResolvedValue(createdCity);

      const result = await service.create({
        name: "Test City",
        northeast: { lat: 41.91, lng: 12.46 },
        southwest: { lat: 41.89, lng: 12.44 },
      });

      expect(result).toEqual({ id: "city-new" });
      expect(cityEntityRepository.query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO"), [
        "Test City",
        12.44,
        41.89,
        12.46,
        41.91,
      ]);
      expect(collectorService.collectPointsForCity).toHaveBeenCalledWith(createdCity);
      expect(eventEmitter.emitAsync).toHaveBeenCalledWith("city.created", createdCity);
    });
  });

  describe("delete", () => {
    it("deletes city by id", async () => {
      cityEntityRepository.delete.mockResolvedValue({ affected: 1 } as never);

      await service.delete("city-1");

      expect(cityEntityRepository.delete).toHaveBeenCalledWith({ id: "city-1" });
    });
  });
});
