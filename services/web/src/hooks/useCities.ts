import { useQuery } from "@tanstack/react-query";

import { fetchCities } from "../api";

export const useCities = () => {
  return useQuery({
    queryKey: ["cities"],
    queryFn: fetchCities,
  });
};
