import { useQuery } from '@tanstack/react-query';
import { useActor } from './useActor';

export function useAppInfo() {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ['appInfo'],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getAppInfo();
    },
    enabled: !!actor && !isFetching,
    staleTime: Infinity,
  });
}
