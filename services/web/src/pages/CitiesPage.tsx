import { useCallback, useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { APIProvider, Map, useMap } from "@vis.gl/react-google-maps";

import type { ICity, IPendingCity } from "../types";
import { CityPolygon } from "../components/CityPolygon";
import { CityGrid } from "../components/CityGrid";
import { PreviewPolygon } from "../components/PreviewPolygon";
import { CityPanel } from "../components/CityPanel";
import { useCities } from "../hooks/useCities";
import { createCity, deleteCity } from "../api";

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY as string;
const DEFAULT_CENTER = { lat: 48.3794, lng: 31.1656 };
const DEFAULT_ZOOM = 5;

const MapController = (props: { selectedCity: ICity | null; pendingCity: IPendingCity | null }) => {
  const { selectedCity, pendingCity } = props;
  const map = useMap();

  useEffect(() => {
    if (!map || !selectedCity) return;
    const coords = selectedCity.boundary.coordinates[0];
    const bounds = new google.maps.LatLngBounds();
    coords.forEach(([lng, lat]) => bounds.extend({ lat, lng }));
    map.fitBounds(bounds, 60);
  }, [map, selectedCity]);

  useEffect(() => {
    if (!map || !pendingCity) return;
    const bounds = new google.maps.LatLngBounds(
      { lat: pendingCity.southwest.lat, lng: pendingCity.southwest.lng },
      { lat: pendingCity.northeast.lat, lng: pendingCity.northeast.lng },
    );
    map.fitBounds(bounds, 60);
  }, [map, pendingCity]);

  return null;
};

export const CitiesPage = () => {
  const queryClient = useQueryClient();
  const { data: cities = [], isPending, error } = useCities();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingCity, setPendingCity] = useState<IPendingCity | null>(null);

  const selectedCity = cities.find(c => c.id === selectedId) ?? null;

  const { mutate: addCity, isPending: isSaving } = useMutation({
    mutationFn: () => {
      if (!pendingCity) throw new Error("No city selected");
      return createCity(pendingCity.name, pendingCity.northeast, pendingCity.southwest);
    },
    onSuccess: () => {
      setPendingCity(null);
      void queryClient.invalidateQueries({ queryKey: ["cities"] });
    },
  });

  const {
    mutate: removeCity,
    isPending: isDeleting,
    variables: deletingId,
    error: deleteError,
  } = useMutation({
    mutationFn: (id: string) => deleteCity(id),
    onSuccess: (_, id) => {
      if (selectedId === id) setSelectedId(null);
      void queryClient.invalidateQueries({ queryKey: ["cities"] });
    },
  });

  const handleSelect = useCallback((city: ICity) => {
    setSelectedId(prev => (prev === city.id ? null : city.id));
    setPendingCity(null);
  }, []);

  const handleCitySelected = useCallback((city: IPendingCity) => {
    setPendingCity(city);
    setSelectedId(null);
  }, []);

  return (
    <APIProvider apiKey={GOOGLE_API_KEY}>
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <CityPanel
          cities={cities}
          isPending={isPending}
          error={error}
          selectedId={selectedId}
          pendingCity={pendingCity}
          isSaving={isSaving}
          deletingId={isDeleting ? (deletingId ?? null) : null}
          deleteError={deleteError}
          onSelect={handleSelect}
          onCitySelected={handleCitySelected}
          onAddCity={() => addCity()}
          onDeleteCity={removeCity}
        />

        <main className="flex-1 h-full relative overflow-hidden">
          <Map
            defaultCenter={DEFAULT_CENTER}
            defaultZoom={DEFAULT_ZOOM}
            gestureHandling="greedy"
            style={{ width: "100%", height: "100%" }}
          >
            <MapController selectedCity={selectedCity} pendingCity={pendingCity} />

            {pendingCity && <PreviewPolygon northeast={pendingCity.northeast} southwest={pendingCity.southwest} />}

            {selectedCity && (
              <>
                <CityPolygon city={selectedCity} isSelected onClick={() => handleSelect(selectedCity)} />
                <CityGrid city={selectedCity} />
              </>
            )}
          </Map>
        </main>
      </div>
    </APIProvider>
  );
};
