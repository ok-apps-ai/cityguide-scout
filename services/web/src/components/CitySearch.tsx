import { useCallback, useEffect, useRef, useState } from "react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import { Search, X } from "lucide-react";

import type { IPendingCity } from "../types";

interface ICitySearchProps {
  onCitySelected: (city: IPendingCity) => void;
}

export const CitySearch = (props: ICitySearchProps) => {
  const { onCitySelected } = props;
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

  /* eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents -- AutocompleteSessionToken from @types/google.maps */
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!placesLib) return;
    sessionTokenRef.current = new placesLib.AutocompleteSessionToken();
  }, [placesLib]);

  useEffect(() => {
    if (!placesLib?.AutocompleteSuggestion || inputValue.trim().length < 2) {
      queueMicrotask(() => {
        setSuggestions([]);
        setIsOpen(false);
      });
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
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
        await place.fetchFields({ fields: ["displayName", "formattedAddress", "location", "viewport"] });
      } catch {
        return;
      }

      const bounds = place.viewport;
      if (!bounds) return;

      onCitySelected({
        name: description,
        northeast: { lat: bounds.getNorthEast().lat(), lng: bounds.getNorthEast().lng() },
        southwest: { lat: bounds.getSouthWest().lat(), lng: bounds.getSouthWest().lng() },
      });

      sessionTokenRef.current = new placesLib.AutocompleteSessionToken();
    },
    [placesLib, onCitySelected],
  );

  return (
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
  );
};
