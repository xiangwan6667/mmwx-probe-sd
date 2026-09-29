import { useQuery } from "@tanstack/react-query";
import { getIpNetworkProfile } from "@lumina/services/ipInfo";

export function useIpNetworkProfile(uuid: string, ip: string) {
  return useQuery({
    queryKey: ["ip-info", "network-profile", uuid, ip],
    queryFn: ({ signal }) => getIpNetworkProfile(uuid, ip, signal),
    enabled: Boolean(uuid && ip),
    staleTime: 10 * 60_000,
    gcTime: 60 * 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
}
