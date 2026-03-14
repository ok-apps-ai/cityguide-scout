import { Test, TestingModule } from "@nestjs/testing";

import { CollectorService } from "./collector.service";
import { GooglePlacesService } from "./google/places/places.service";
import { OsmPlacesService } from "./osm/places/places.service";
import { CityEntity } from "../city/city.entity";

describe("CollectorService", () => {
  let service: CollectorService;
  let googlePlacesService: GooglePlacesService;
  let osmPlacesService: OsmPlacesService;

  const cityEntity = {
    id: "city-1",
    name: "Vatican City",
    boundary: {},
  } as CityEntity;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollectorService,
        {
          provide: GooglePlacesService,
          useValue: { collectPointsForCity: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: OsmPlacesService,
          useValue: { collectPointsForCity: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    service = module.get(CollectorService);
    googlePlacesService = module.get(GooglePlacesService);
    osmPlacesService = module.get(OsmPlacesService);

    jest.clearAllMocks();
  });

  it("calls both Google and OSM collectPointsForCity", async () => {
    await service.collectPointsForCity(cityEntity);

    expect(googlePlacesService.collectPointsForCity).toHaveBeenCalledWith(cityEntity);
    expect(osmPlacesService.collectPointsForCity).toHaveBeenCalledWith(cityEntity);
  });

  it("calls both collectors in parallel", async () => {
    let googleResolved = false;
    let osmResolved = false;
    jest.spyOn(googlePlacesService, "collectPointsForCity").mockImplementation(
      () =>
        new Promise(resolve => {
          googleResolved = true;
          setTimeout(resolve, 10);
        }),
    );
    jest.spyOn(osmPlacesService, "collectPointsForCity").mockImplementation(
      () =>
        new Promise(resolve => {
          osmResolved = true;
          setTimeout(resolve, 10);
        }),
    );

    const promise = service.collectPointsForCity(cityEntity);
    await new Promise(resolve => setTimeout(resolve, 5));

    expect(googleResolved).toBe(true);
    expect(osmResolved).toBe(true);
    await promise;
  });
});
