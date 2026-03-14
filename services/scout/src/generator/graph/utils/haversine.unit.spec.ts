import { haversineMeters } from "./haversine";

describe("haversineMeters", () => {
  it("returns 0 for same point", () => {
    const lat = 36.5;
    const lng = -4.9;
    expect(haversineMeters(lat, lng, lat, lng)).toBe(0);
  });

  it("returns positive distance for different points", () => {
    const d = haversineMeters(36.48, -4.98, 36.49, -4.99);
    expect(d).toBeGreaterThan(0);
    expect(typeof d).toBe("number");
  });

  it("approximates ~1km for ~0.01 degree at mid-latitudes", () => {
    const d = haversineMeters(36.5, -4.9, 36.51, -4.9);
    expect(d).toBeGreaterThan(900);
    expect(d).toBeLessThan(1200);
  });

  it("is symmetric", () => {
    const d1 = haversineMeters(36.48, -4.98, 36.49, -4.99);
    const d2 = haversineMeters(36.49, -4.99, 36.48, -4.98);
    expect(d1).toBe(d2);
  });
});
