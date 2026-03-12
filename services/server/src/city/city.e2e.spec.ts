import * as path from "path";

import axios from "axios";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../..", ".env.development") });

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY ?? "";
const GEOCODING_URL = "https://maps.googleapis.com/maps/api/geocode/json";
const SERVER_URL = process.env.SERVER_URL ?? "http://localhost:3001";

interface ILatLng {
  lat: number;
  lng: number;
}

interface IGeocodingBounds {
  northeast: ILatLng;
  southwest: ILatLng;
}

interface IGeocodingResult {
  formatted_address: string;
  geometry: {
    bounds?: IGeocodingBounds;
    viewport: IGeocodingBounds;
  };
}

interface IGeocodingResponse {
  status: string;
  results: IGeocodingResult[];
  error_message?: string;
}

const getCityBounds = async (
  cityName: string,
): Promise<{ northeast: ILatLng; southwest: ILatLng; formattedAddress: string }> => {
  const response = await axios.get<IGeocodingResponse>(GEOCODING_URL, {
    params: { address: cityName, key: GOOGLE_API_KEY },
  });

  const { status, results, error_message } = response.data;

  if (status !== "OK" || results.length === 0) {
    throw new Error(`Geocoding failed for "${cityName}": ${status}${error_message ? ` — ${error_message}` : ""}`);
  }

  const result = results[0];
  const bounds = result.geometry.bounds ?? result.geometry.viewport;

  return {
    northeast: bounds.northeast,
    southwest: bounds.southwest,
    formattedAddress: result.formatted_address,
  };
};

describe("POST /cities — e2e", () => {
  const cities = ["Kyiv, Ukraine", "Tbilisi, Georgia", "Vatican City", "Marbella, Spain"];

  it.each(cities)(
    "geocodes %s and registers it via POST /cities",
    async cityName => {
      const { northeast, southwest, formattedAddress } = await getCityBounds(cityName);

      console.info(`\n  Geocoded: ${formattedAddress}`);
      console.info(`  SW: [${southwest.lat}, ${southwest.lng}]`);
      console.info(`  NE: [${northeast.lat}, ${northeast.lng}]`);

      const response = await axios.post<{ id: string }>(
        `${SERVER_URL}/cities`,
        { name: cityName, northeast, southwest },
        { headers: { "Content-Type": "application/json" } },
      );

      expect(response.status).toEqual(201);
      expect(response.data.id).toBeDefined();

      console.info(`  City registered: id=${response.data.id}`);
    },
    30000,
  );
});
