import { useMemo } from "react";
import { useMinuteClock } from "@lumina/hooks/useClock";
import { buildFakePingItem } from "@lumina/utils/fakePing";
import {
  invertHomepagePingTaskBindings,
  type HomepagePingTaskBindings,
} from "@lumina/utils/pingTasks";
import type { PingOverviewItem } from "@lumina/types/komari";

export function useFakePingFallback(
  uuid: string,
  ping: PingOverviewItem,
  isOnline: boolean,
  fakePingForUnbound: boolean,
  homepagePingBindings: HomepagePingTaskBindings,
): PingOverviewItem {
  const boundUuids = useMemo(
    () =>
      fakePingForUnbound
        ? invertHomepagePingTaskBindings(homepagePingBindings)
        : null,
    [fakePingForUnbound, homepagePingBindings],
  );

  const shouldFake =
    isOnline &&
    boundUuids != null &&
    !boundUuids.has(uuid) &&
    !ping.isAssigned;

  const minuteIndex = Math.floor(useMinuteClock(shouldFake) / 60_000);

  return useMemo(
    () => (shouldFake ? buildFakePingItem(uuid, minuteIndex) : ping),
    [shouldFake, uuid, minuteIndex, ping],
  );
}
