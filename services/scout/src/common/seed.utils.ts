/** Returns a function that produces raw SQL for ST_GeomFromText. Use for geometry overrides in seed services. */
export const geomFromWkt = (wkt: string) => () => `ST_GeomFromText('${wkt.replace(/'/g, "''")}', 4326)`;
