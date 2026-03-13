import { Test, TestingModule } from "@nestjs/testing";
import { HttpModule, HttpService } from "@nestjs/axios";
import { ConfigModule } from "@nestjs/config";
import { of, throwError } from "rxjs";

import { GooglePlaceMediaUrlProvider } from "./google-place-media-url-provider.service";

describe("GooglePlaceMediaUrlProvider", () => {
  let service: GooglePlaceMediaUrlProvider;
  let httpService: HttpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ envFilePath: `.env.${process.env.NODE_ENV}` }), HttpModule],
      providers: [GooglePlaceMediaUrlProvider],
    }).compile();

    service = module.get(GooglePlaceMediaUrlProvider);
    httpService = module.get(HttpService);
  });

  it("returns photoUri when getMedia succeeds", async () => {
    const photoName = "places/ChIJ123/photos/Atxxx";
    const expectedUri = "https://storage.googleapis.com/places-photos/xxx.jpg";

    jest.spyOn(httpService, "get").mockReturnValue(
      of({
        data: { photoUri: expectedUri },
        status: 200,
        statusText: "OK",
        headers: {},
        config: {} as never,
      }),
    );

    const result = await service.getPlaceMediaUrl(photoName);

    expect(result).toEqual(expectedUri);
    expect(httpService.get).toHaveBeenCalledWith(
      "https://places.googleapis.com/v1/places/ChIJ123/photos/Atxxx/media",
      expect.objectContaining({
        params: { maxWidthPx: 800, skipHttpRedirect: true },
        headers: expect.objectContaining({
          "X-Goog-Api-Key": expect.stringMatching(/.+/),
        }),
      }),
    );
  });

  it("returns null when getMedia fails", async () => {
    jest.spyOn(httpService, "get").mockReturnValue(throwError(() => new Error("Network error")));

    const result = await service.getPlaceMediaUrl("places/ChIJ123/photos/Atxxx");

    expect(result).toBeNull();
  });

  it("returns null when response has no photoUri", async () => {
    jest.spyOn(httpService, "get").mockReturnValue(
      of({
        data: {},
        status: 200,
        statusText: "OK",
        headers: {},
        config: {} as never,
      }),
    );

    const result = await service.getPlaceMediaUrl("places/ChIJ123/photos/Atxxx");

    expect(result).toBeNull();
  });

  it("returns null when API key is empty", async () => {
    process.env.GOOGLE_API_KEY = "";
    const moduleWithNoKey = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ envFilePath: `.env.${process.env.NODE_ENV}` }), HttpModule],
      providers: [GooglePlaceMediaUrlProvider],
    }).compile();

    const svc = moduleWithNoKey.get(GooglePlaceMediaUrlProvider);
    const result = await svc.getPlaceMediaUrl("places/ChIJ123/photos/Atxxx");

    expect(result).toBeNull();
  });
});
