import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { getDataSourceToken } from "@nestjs/typeorm";

import { GeneratorService } from "./generator.service";
import { DEFAULT_ROUTE_GENERATION_OPTIONS } from "./route-presets";
import { PlaceService } from "../place/place.service";
import { PlaceOsmResolutionService } from "../place/place-osm-resolution.service";
import { RouteService } from "../route/route.service";
import { CityEntity } from "../city/city.entity";

const mockGraphInvoke = jest.fn();

jest.mock("./graph/route.graph", () => ({
  buildRouteGraph: () => ({
    invoke: mockGraphInvoke,
  }),
}));

describe("GeneratorService", () => {
  let service: GeneratorService;

  const cityEntity = { id: "city-1", name: "Vatican City" } as CityEntity;

  beforeEach(async () => {
    mockGraphInvoke.mockReset();
    mockGraphInvoke.mockResolvedValue({
      savedRoutes: ["route-1", "route-2"],
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeneratorService,
        {
          provide: PlaceService,
          useValue: {},
        },
        {
          provide: PlaceOsmResolutionService,
          useValue: {},
        },
        {
          provide: RouteService,
          useValue: {},
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: unknown) => {
              if (key === "OPENAI_API_KEY") return "test-key";
              if (key === "ROUTE_GRAPH_RECURSION_LIMIT") return 500;
              return defaultValue;
            }),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {},
        },
        {
          provide: getDataSourceToken(),
          useValue: {},
        },
      ],
    }).compile();

    service = module.get(GeneratorService);
  });

  describe("onCityCreated", () => {
    it("calls generateForCity with city id", async () => {
      const generateSpy = jest.spyOn(service, "generateForCity").mockResolvedValue([]);

      await service.onCityCreated(cityEntity);

      expect(generateSpy).toHaveBeenCalledWith("city-1");
    });
  });

  describe("generateForCity", () => {
    it("invokes graph and returns saved route ids", async () => {
      const result = await service.generateForCity("city-1");

      expect(result).toEqual(["route-1", "route-2"]);
      expect(mockGraphInvoke).toHaveBeenCalledWith(
        expect.objectContaining({
          cityId: "city-1",
          routeGenerationOptions: expect.any(Object),
        }),
        expect.objectContaining({ recursionLimit: 500 }),
      );
    });

    it("passes custom preset when provided", async () => {
      const customPreset: typeof DEFAULT_ROUTE_GENERATION_OPTIONS = {
        ...DEFAULT_ROUTE_GENERATION_OPTIONS,
        durationPresetsMinutes: [90],
      };

      await service.generateForCity("city-1", customPreset);

      expect(mockGraphInvoke).toHaveBeenCalledWith(
        expect.objectContaining({
          routeGenerationOptions: customPreset,
        }),
        expect.any(Object),
      );
    });
  });
});
