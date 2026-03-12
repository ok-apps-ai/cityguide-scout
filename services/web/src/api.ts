import type { ICity, ILatLng, IRoute } from "./types";

const SERVER_URL = import.meta.env.VITE_SERVER_URL as string;

// eslint-disable-next-line n/no-unsupported-features/node-builtins
async function parseError(response: Response, context: string): Promise<never> {
  let message = `${response.status} ${response.statusText}`;
  try {
    const body = (await response.json()) as { message?: string | string[] };
    const msg = body?.message;
    if (msg) message = Array.isArray(msg) ? msg.join(", ") : msg;
  } catch {
    /* ignore */
  }
  throw new Error(`${context}: ${message}`);
}

export const fetchCities = async (): Promise<ICity[]> => {
  // eslint-disable-next-line n/no-unsupported-features/node-builtins
  const response = await fetch(`${SERVER_URL}/cities`);
  if (!response.ok) await parseError(response, "Failed to fetch cities");
  return response.json() as Promise<ICity[]>;
};

export const createCity = async (name: string, northeast: ILatLng, southwest: ILatLng): Promise<{ id: string }> => {
  // eslint-disable-next-line n/no-unsupported-features/node-builtins
  const response = await fetch(`${SERVER_URL}/cities`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, northeast, southwest }),
  });
  if (!response.ok) await parseError(response, "Failed to create city");
  return response.json() as Promise<{ id: string }>;
};

export const deleteCity = async (id: string): Promise<void> => {
  // eslint-disable-next-line n/no-unsupported-features/node-builtins
  const response = await fetch(`${SERVER_URL}/cities/${id}`, { method: "DELETE" });
  if (!response.ok) await parseError(response, "Failed to delete city");
};

export const fetchRoutesByCityId = async (
  cityId: string,
  routeMode?: string | null,
): Promise<IRoute[]> => {
  const body = routeMode ? { routeMode } : {};
  // eslint-disable-next-line n/no-unsupported-features/node-builtins
  const response = await fetch(`${SERVER_URL}/cities/${cityId}/routes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) await parseError(response, "Failed to fetch routes");
  return response.json() as Promise<IRoute[]>;
};
