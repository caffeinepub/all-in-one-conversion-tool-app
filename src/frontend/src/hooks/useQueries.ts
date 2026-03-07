import { useQuery } from "@tanstack/react-query";
import { useActor } from "./useActor";

export function useAppInfo() {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ["appInfo"],
    queryFn: async () => {
      if (!actor) return null;
      // getAppInfo may not exist on all backend versions
      if (
        typeof (actor as unknown as Record<string, unknown>).getAppInfo ===
        "function"
      ) {
        return (actor as unknown as Record<string, unknown>).getAppInfo;
      }
      return null;
    },
    enabled: !!actor && !isFetching,
    staleTime: Number.POSITIVE_INFINITY,
  });
}
