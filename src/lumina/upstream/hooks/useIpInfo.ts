import { useQuery } from "@tanstack/react-query";
import { getIpInfo, getIpInfoStatus, type IpInfoLookup } from "@lumina/services/ipInfo";
import { getCountryCodeFromRegion } from "@lumina/utils/geo";

function cleanAddress(value: string | null | undefined) {
  const address = String(value ?? "").trim();
  if (!address) return "";
  if (address.startsWith("[") && address.endsWith("]")) return address.slice(1, -1);
  return address;
}

function useAddressLookup(uuid: string, ip: string, enabled: boolean) {
  return useQuery({
    queryKey: ["ip-info", "lookup", uuid, ip],
    queryFn: ({ signal }) => getIpInfo(uuid, ip, signal),
    enabled: enabled && Boolean(uuid && ip),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

export function useIpInfo(
  uuid: string,
  ipv4?: string,
  ipv6?: string,
  region?: string,
  enabled = true,
) {
  const address4 = cleanAddress(ipv4);
  const address6 = cleanAddress(ipv6);
  const hasAddress = Boolean(address4 || address6);
  const excludedByBackendRegion = getCountryCodeFromRegion(region) === "CN";
  const statusQuery = useQuery({
    queryKey: ["ip-info", "status"],
    queryFn: ({ signal }) => getIpInfoStatus(signal),
    enabled: Boolean(enabled && uuid && hasAddress && !excludedByBackendRegion),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const pluginAvailable = enabled && !excludedByBackendRegion && statusQuery.data?.available === true;
  const ipv4Query = useAddressLookup(uuid, address4, pluginAvailable);
  const ipv6Query = useAddressLookup(uuid, address6, pluginAvailable);
  const lookups = !enabled || excludedByBackendRegion
    ? []
    : [ipv4Query.data, ipv6Query.data].filter(
        (entry): entry is IpInfoLookup => Boolean(entry && !entry.data.excluded),
      );

  return {
    available: lookups.length > 0,
    lookups,
  };
}
