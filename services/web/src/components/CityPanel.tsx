import { useQueryClient } from "@tanstack/react-query";

import type { ICity, IPendingCity } from "../types";
import { CitySearch } from "./CitySearch";

const GRID_STEP_DEGREES = Number(import.meta.env.VITE_GRID_STEP_DEGREES ?? 0.02);

const Spinner = () => (
  <svg
    className="animate-spin h-3.5 w-3.5 text-gray-400"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

const countGridCells = (city: ICity): number => {
  const coords = city.boundary.coordinates[0];
  const lngs = coords.map(([lng]) => lng);
  const lats = coords.map(([, lat]) => lat);
  const cols = Math.ceil((Math.max(...lngs) - Math.min(...lngs)) / GRID_STEP_DEGREES);
  const rows = Math.ceil((Math.max(...lats) - Math.min(...lats)) / GRID_STEP_DEGREES);
  return cols * rows;
};

interface ICityPanelProps {
  cities: ICity[];
  isPending: boolean;
  error: Error | null;
  selectedId: string | null;
  pendingCity: IPendingCity | null;
  isSaving: boolean;
  deletingId: string | null;
  deleteError: Error | null;
  onSelect: (city: ICity) => void;
  onCitySelected: (city: IPendingCity) => void;
  onAddCity: () => void;
  onDeleteCity: (id: string) => void;
}

export const CityPanel = (props: ICityPanelProps) => {
  const {
    cities,
    isPending,
    error,
    selectedId,
    pendingCity,
    isSaving,
    deletingId,
    deleteError,
    onSelect,
    onCitySelected,
    onAddCity,
    onDeleteCity,
  } = props;
  const queryClient = useQueryClient();

  const handleRefetch = () => {
    void queryClient.invalidateQueries({ queryKey: ["cities"] });
  };

  return (
    <aside className="w-70 shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-hidden shadow-[2px_0_8px_rgba(0,0,0,0.06)] z-10">
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900 tracking-wide">Cities</h2>
        <button
          className="text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded p-1 text-lg leading-none transition-colors cursor-pointer"
          onClick={handleRefetch}
          title="Refresh"
        >
          ↻
        </button>
      </div>

      <CitySearch onCitySelected={onCitySelected} />

      {pendingCity && (
        <div className="px-3 py-2.5 bg-blue-50 border-b border-blue-100 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-blue-700 truncate">{pendingCity.name}</p>
            <p className="text-xs text-blue-400 mt-0.5">Preview shown on map</p>
          </div>
          <button
            className="shrink-0 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            onClick={onAddCity}
            disabled={isSaving}
          >
            {isSaving ? "Saving…" : "+ Add"}
          </button>
        </div>
      )}

      {isPending && <p className="px-4 py-3 text-xs text-gray-400">Loading…</p>}

      {(error || deleteError) && <p className="px-4 py-3 text-xs text-red-600">{(error ?? deleteError)!.message}</p>}

      {!isPending && !error && !deleteError && cities.length === 0 && (
        <p className="px-4 py-3 text-xs text-gray-400 leading-relaxed">No cities yet. Search above to add one.</p>
      )}

      <ul className="overflow-y-auto flex-1 py-2">
        {cities.map(city => {
          const isSelected = selectedId === city.id;
          const cellCount = countGridCells(city);
          return (
            <li
              key={city.id}
              className={`group flex items-center gap-2.5 px-4 py-2.5 cursor-pointer transition-colors ${
                isSelected ? "bg-blue-50" : "hover:bg-gray-50"
              }`}
              onClick={() => onSelect(city)}
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${isSelected ? "bg-blue-600" : "bg-green-500"}`} />
              <span
                className={`text-sm truncate flex-1 ${isSelected ? "text-blue-600 font-semibold" : "text-gray-800"}`}
              >
                {city.name}
              </span>
              <span className="text-xs text-gray-400 shrink-0 tabular-nums">{cellCount}</span>
              {deletingId === city.id ? (
                <span className="shrink-0 w-5 h-5 flex items-center justify-center" title="Deleting…">
                  <Spinner />
                </span>
              ) : (
                <button
                  className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-gray-300 hover:bg-red-100 hover:text-red-500 transition-colors cursor-pointer opacity-0 group-hover:opacity-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Delete city"
                  disabled={!!deletingId}
                  onClick={e => {
                    e.stopPropagation();
                    onDeleteCity(city.id);
                  }}
                >
                  ✕
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </aside>
  );
};
