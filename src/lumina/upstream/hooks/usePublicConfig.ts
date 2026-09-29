import { useQuery } from "@tanstack/react-query";
import { getPublic } from "@lumina/services/api";
import type { PublicConfig } from "@lumina/types/komari";

export function usePublicConfig() {
  return useQuery<PublicConfig>({
    queryKey: ["public"],
    queryFn: ({ signal }) => getPublic({ signal }),
    staleTime: 60_000,
  });
}
