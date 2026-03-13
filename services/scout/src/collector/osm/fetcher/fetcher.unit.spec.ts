import { Test, TestingModule } from "@nestjs/testing";
import { HttpModule, HttpService } from "@nestjs/axios";
import { of, throwError } from "rxjs";

import { OsmOverpassFetcherService } from "./fetcher.service";
import type { IOverpassElement } from "./types";

const bbox = { south: 36.5, west: -5.0, north: 36.6, east: -4.9 };

function overpassElement(id: number, type: "node" | "way" = "node"): IOverpassElement {
  return {
    type,
    id,
    lat: 36.55,
    lon: -4.95,
    tags: { name: `Place ${id}`, tourism: "attraction" },
  };
}

describe("OsmOverpassFetcherService", () => {
  let service: OsmOverpassFetcherService;
  let httpService: HttpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [HttpModule],
      providers: [OsmOverpassFetcherService],
    }).compile();

    service = module.get(OsmOverpassFetcherService);
    httpService = module.get(HttpService);
  });

  it("returns elements from single tile", async () => {
    const el1 = overpassElement(1);
    const el2 = overpassElement(2);

    jest.spyOn(httpService, "get").mockReturnValue(
      of({
        data: { elements: [el1, el2] },
        status: 200,
        statusText: "OK",
        headers: {},
        config: {} as never,
      }),
    );

    const result = await service.fetchElements({ bbox });

    expect(result).toHaveLength(2);
    expect(result.map(e => e.id)).toEqual([1, 2]);
    expect(httpService.get).toHaveBeenCalledTimes(1);
  });

  it("retries on 429 and succeeds", async () => {
    const el = overpassElement(1);
    jest
      .spyOn(httpService, "get")
      .mockReturnValueOnce(throwError(() => Object.assign(new Error("Rate limited"), { response: { status: 429 } })))
      .mockReturnValueOnce(
        of({
          data: { elements: [el] },
          status: 200,
          statusText: "OK",
          headers: {},
          config: {} as never,
        }),
      );

    const result = await service.fetchElements({ bbox });

    expect(result).toHaveLength(1);
    expect(result[0].id).toEqual(1);
    expect(httpService.get).toHaveBeenCalledTimes(2);
  });

  it("retries on 500 and succeeds", async () => {
    const el = overpassElement(42);
    jest
      .spyOn(httpService, "get")
      .mockReturnValueOnce(throwError(() => Object.assign(new Error("Server error"), { response: { status: 500 } })))
      .mockReturnValueOnce(
        of({
          data: { elements: [el] },
          status: 200,
          statusText: "OK",
          headers: {},
          config: {} as never,
        }),
      );

    const result = await service.fetchElements({ bbox });

    expect(result).toHaveLength(1);
    expect(result[0].id).toEqual(42);
    expect(httpService.get).toHaveBeenCalledTimes(2);
  });

  it("does not retry on 400", async () => {
    jest
      .spyOn(httpService, "get")
      .mockReturnValue(throwError(() => Object.assign(new Error("Bad request"), { response: { status: 400 } })));

    await expect(service.fetchElements({ bbox })).rejects.toThrow("Bad request");

    expect(httpService.get).toHaveBeenCalledTimes(1);
  });

  it("splits bbox into tiles when tileSizeDeg produces 2×2 grid", async () => {
    const el1 = overpassElement(1);
    const el2 = overpassElement(2);
    const el3 = overpassElement(3);
    const el4 = overpassElement(4);

    const emptyResponse = of({
      data: { elements: [] },
      status: 200,
      statusText: "OK",
      headers: {},
      config: {} as never,
    });
    jest
      .spyOn(httpService, "get")
      .mockReturnValueOnce(
        of({
          data: { elements: [el1, el2] },
          status: 200,
          statusText: "OK",
          headers: {},
          config: {} as never,
        }),
      )
      .mockReturnValueOnce(
        of({
          data: { elements: [el3] },
          status: 200,
          statusText: "OK",
          headers: {},
          config: {} as never,
        }),
      )
      .mockReturnValueOnce(
        of({
          data: { elements: [el4] },
          status: 200,
          statusText: "OK",
          headers: {},
          config: {} as never,
        }),
      )
      .mockReturnValueOnce(
        of({
          data: { elements: [] },
          status: 200,
          statusText: "OK",
          headers: {},
          config: {} as never,
        }),
      )
      .mockReturnValue(emptyResponse);

    const result = await service.fetchElements({ bbox, tileSizeDeg: 0.06 });

    expect(result).toHaveLength(4);
    expect(result.map(e => e.id).sort((a, b) => a - b)).toEqual([1, 2, 3, 4]);
    expect(httpService.get).toHaveBeenCalledTimes(4);
  });

  it("deduplicates elements across tiles", async () => {
    const el = overpassElement(1);
    jest.spyOn(httpService, "get").mockReturnValue(
      of({
        data: { elements: [el] },
        status: 200,
        statusText: "OK",
        headers: {},
        config: {} as never,
      }),
    );

    const result = await service.fetchElements({ bbox, tileSizeDeg: 0.06 });

    expect(result).toHaveLength(1);
    expect(result[0].id).toEqual(1);
    expect(httpService.get).toHaveBeenCalledTimes(4);
  });

  it("uses custom query when provided", async () => {
    jest.spyOn(httpService, "get").mockReturnValue(
      of({
        data: { elements: [] },
        status: 200,
        statusText: "OK",
        headers: {},
        config: {} as never,
      }),
    );

    const customQuery = `[out:json];node["amenity"](36.5,-5,36.6,-4.9);out;`;

    await service.fetchElements({ bbox, query: customQuery });

    const callUrl = (httpService.get as jest.Mock).mock.calls[0][0];
    expect(decodeURIComponent(callUrl)).toContain(customQuery);
  });
});
