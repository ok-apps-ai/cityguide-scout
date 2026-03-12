import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bike, Car, PersonStanding, RefreshCw, Search, X } from "lucide-react";

import type { ICity, IRoute } from "../types";
import { fetchRoutesByCityId } from "../api";

const PRICE_LABELS: Record<string, string> = {
  free: "Free",
  inexpensive: "$",
  moderate: "$$",
  expensive: "$$$",
  very_expensive: "$$$$",
};

interface IRoutesPanelProps {
  cities: ICity[];
  isCitiesPending: boolean;
  citiesError: Error | null;
  onCitySelect: (city: ICity | null) => void;
  onRouteSelect: (route: IRoute | null) => void;
}

export const RoutesPanel = (props: IRoutesPanelProps) => {
  const { cities, isCitiesPending, citiesError, onCitySelect, onRouteSelect } = props;
  const queryClient = useQueryClient();
  const placesLib = useMapsLibrary("places");

  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<
    Array<{
      placeId: string;
      text: { text: string };
      mainText?: { text: string };
      secondaryText?: { text: string };
    }>
  >([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState<ICity | null>(null);
  const [searchedName, setSearchedName] = useState<string | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<IRoute | null>(null);
  const [routeModeFilter, setRouteModeFilter] = useState<"walking" | "cycling" | "driving" | null>(null);

  /* eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents -- AutocompleteSessionToken from @types/google.maps */
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!placesLib) return;
    sessionTokenRef.current = new placesLib.AutocompleteSessionToken();
  }, [placesLib]);

  useEffect(() => {
    if (!placesLib?.AutocompleteSuggestion || inputValue.trim().length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const token = sessionTokenRef.current ?? new placesLib.AutocompleteSessionToken();
    sessionTokenRef.current = token;

    void placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
      input: inputValue,
      includedPrimaryTypes: ["locality"],
      sessionToken: token,
    })
      .then(({ suggestions: s }) => {
        const placePredictions = s
          .map(x => x.placePrediction)
          .filter((p): p is google.maps.places.PlacePrediction => !!p)
          .map(p => ({
            placeId: p.placeId,
            text: { text: p.text?.text ?? "" },
            mainText: p.mainText ? { text: p.mainText.text } : undefined,
            secondaryText: p.secondaryText ? { text: p.secondaryText.text } : undefined,
          }));
        setSuggestions(placePredictions);
        setIsOpen(placePredictions.length > 0);
      })
      .catch(() => {
        setSuggestions([]);
        setIsOpen(false);
      });
  }, [placesLib, inputValue]);

  useEffect(() => {
    setRouteModeFilter(null);
  }, [selectedCity?.id]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const findMatchingCity = useCallback(
    (placeName: string): ICity | null => {
      const normalized = placeName.toLowerCase().trim();
      return (
        cities.find(c => c.name.toLowerCase() === normalized) ??
        cities.find(c => c.name.toLowerCase().includes(normalized.split(",")[0] ?? "")) ??
        null
      );
    },
    [cities],
  );

  const handleSelect = useCallback(
    async (prediction: {
      placeId: string;
      text: { text: string };
      mainText?: { text: string };
      secondaryText?: { text: string };
    }) => {
      const description = prediction.text?.text ?? "";
      setInputValue(description);
      setIsOpen(false);
      setSuggestions([]);

      if (!placesLib) return;

      const place = new placesLib.Place({ id: prediction.placeId });
      try {
        await place.fetchFields({ fields: ["displayName", "formattedAddress"] });
      } catch {
        return;
      }

      setSearchedName(description);
      const match = findMatchingCity(description);
      setSelectedCity(match);
      onCitySelect(match);

      sessionTokenRef.current = new placesLib.AutocompleteSessionToken();
    },
    [placesLib, findMatchingCity, onCitySelect],
  );

  const { data: routes = [], isPending: isRoutesPending } = useQuery({
    queryKey: ["routes", selectedCity?.id, routeModeFilter],
    queryFn: () => fetchRoutesByCityId(selectedCity!.id, routeModeFilter),
    enabled: !!selectedCity?.id,
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRefetch = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await queryClient.refetchQueries({ queryKey: ["cities"] });
      if (selectedCity?.id) {
        await queryClient.refetchQueries({ queryKey: ["routes", selectedCity.id, routeModeFilter] });
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [queryClient, selectedCity?.id, routeModeFilter]);

  useEffect(() => {
    if (routes.length > 0) {
      const stillSelected = selectedRoute && routes.some(r => r.id === selectedRoute.id);
      if (stillSelected) return;
      const first = routes[0];
      setSelectedRoute(first);
      onRouteSelect(first);
    } else {
      setSelectedRoute(null);
      onRouteSelect(null);
    }
  }, [routes, selectedRoute, onRouteSelect]);

  return (
    <aside className="w-70 shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-hidden shadow-[2px_0_8px_rgba(0,0,0,0.06)] z-10">
      <div className="flex items-center justify-between gap-2 px-4 py-4 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900 tracking-wide shrink-0">Routes</h2>
        <div className="flex items-center gap-0.5 rounded-lg border border-gray-200 bg-gray-50 p-0.5">
          <button
            className={`rounded p-1.5 transition-colors cursor-pointer ${
              routeModeFilter === "walking"
                ? "bg-blue-100 text-blue-700"
                : "text-gray-500 hover:text-blue-600 hover:bg-gray-100"
            }`}
            onClick={() => setRouteModeFilter(m => (m === "walking" ? null : "walking"))}
            title="Walking"
            aria-label="Filter by walking"
          >
            <PersonStanding className="w-4 h-4" strokeWidth={2} />
          </button>
          <button
            className={`rounded p-1.5 transition-colors cursor-pointer ${
              routeModeFilter === "cycling"
                ? "bg-blue-100 text-blue-700"
                : "text-gray-500 hover:text-blue-600 hover:bg-gray-100"
            }`}
            onClick={() => setRouteModeFilter(m => (m === "cycling" ? null : "cycling"))}
            title="Cycling"
            aria-label="Filter by cycling"
          >
            <Bike className="w-4 h-4" strokeWidth={2} />
          </button>
          <button
            className={`rounded p-1.5 transition-colors cursor-pointer ${
              routeModeFilter === "driving"
                ? "bg-blue-100 text-blue-700"
                : "text-gray-500 hover:text-blue-600 hover:bg-gray-100"
            }`}
            onClick={() => setRouteModeFilter(m => (m === "driving" ? null : "driving"))}
            title="Driving"
            aria-label="Filter by driving"
          >
            <Car className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>
        <button
          className="text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded p-1 text-lg leading-none transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          onClick={() => void handleRefetch()}
          disabled={isRefreshing}
          title="Refresh"
          aria-label="Refresh routes"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} strokeWidth={2} />
        </button>
      </div>

      <div ref={containerRef} className="relative px-3 py-2 border-b border-gray-100">
        <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200 focus-within:border-blue-400 focus-within:bg-white transition-colors">
          <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" strokeWidth={2} />
          <input
            className="bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none w-full"
            type="text"
            placeholder="Search city…"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          />
          {inputValue && (
            <button
              className="text-gray-400 hover:text-gray-600 cursor-pointer flex items-center justify-center"
              onClick={() => {
                setInputValue("");
                setSuggestions([]);
                setIsOpen(false);
                setSearchedName(null);
                setSelectedCity(null);
                setSelectedRoute(null);
                onCitySelect(null);
                onRouteSelect(null);
              }}
            >
              <X className="w-3.5 h-3.5" strokeWidth={2} />
            </button>
          )}
        </div>

        {isOpen && suggestions.length > 0 && (
          <ul className="absolute left-3 right-3 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
            {suggestions.map(s => (
              <li
                key={s.placeId}
                className="px-3 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 cursor-pointer transition-colors"
                onMouseDown={() => {
                  void handleSelect(s);
                }}
              >
                <span className="font-medium">{s.mainText?.text ?? s.text?.text}</span>
                {s.secondaryText?.text && <span className="text-xs text-gray-400 ml-1.5">{s.secondaryText.text}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>

      {isCitiesPending && <p className="px-4 py-3 text-xs text-gray-400">Loading cities…</p>}
      {citiesError && <p className="px-4 py-3 text-xs text-red-600">{citiesError.message}</p>}

      {searchedName && !selectedCity && (
        <p className="px-4 py-3 text-xs text-amber-600">
          City not in database.{" "}
          <Link to="/cities" className="underline hover:text-amber-700">
            Add it from the Cities page
          </Link>{" "}
          first.
        </p>
      )}

      {selectedCity && cities.find(c => c.id === selectedCity.id) && (
        <>
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">{selectedCity.name}</p>
          </div>

          {isRoutesPending && <p className="px-4 py-3 text-xs text-gray-400">Loading routes…</p>}

          {!isRoutesPending && routes.length === 0 && (
            <p className="px-4 py-3 text-xs text-gray-400">
              {routeModeFilter ? "No routes match the selected filter." : "No routes for this city yet."}
            </p>
          )}

          <ul className="overflow-y-auto flex-1 py-2">
            {routes.map(route => (
              <li
                key={route.id}
                className={`px-4 py-3 border-b border-gray-50 last:border-0 cursor-pointer transition-colors ${
                  selectedRoute?.id === route.id ? "bg-blue-50 border-l-4 border-l-blue-500" : "hover:bg-gray-50"
                }`}
                onClick={() => {
                  setSelectedRoute(route);
                  onRouteSelect(route);
                }}
              >
                <p className="text-sm font-medium text-gray-900">{route.name}</p>
                <div className="flex gap-3 mt-1 text-xs text-gray-500">
                  <span>{route.durationMinutes} min</span>
                  <span>{route.distanceKm} km</span>
                  <span className="text-amber-600">{PRICE_LABELS[route.priceLevel] ?? route.priceLevel}</span>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {!selectedCity && !isCitiesPending && !citiesError && (
        <p className="px-4 py-3 text-xs text-gray-400">Search for a city to view its routes.</p>
      )}
    </aside>
  );
};
