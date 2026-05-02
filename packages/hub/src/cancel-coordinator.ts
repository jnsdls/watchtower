export type CancelNotice = {
  readonly runId: string;
};

type Awaiter = {
  readonly resolve: (notice: CancelNotice) => void;
  readonly reject: (reason: unknown) => void;
  readonly signal?: AbortSignal;
  readonly abort: () => void;
};

export const createCancelCoordinator = () => {
  const requestedRunIds = new Set<string>();
  const completedRunIds = new Set<string>();
  const awaitersByRunId = new Map<string, Set<Awaiter>>();

  const removeAwaiter = (runId: string, awaiter: Awaiter) => {
    const awaiters = awaitersByRunId.get(runId);

    if (!awaiters) {
      return;
    }

    awaiters.delete(awaiter);
    awaiter.signal?.removeEventListener("abort", awaiter.abort);

    if (awaiters.size === 0) {
      awaitersByRunId.delete(runId);
    }
  };

  const resolveAwaiters = (runId: string) => {
    const awaiters = awaitersByRunId.get(runId);

    if (!awaiters) {
      return;
    }

    for (const awaiter of awaiters) {
      awaiter.signal?.removeEventListener("abort", awaiter.abort);
      awaiter.resolve({ runId });
    }

    awaitersByRunId.delete(runId);
  };

  return {
    requestCancel(runId: string) {
      if (completedRunIds.has(runId)) {
        return false;
      }

      requestedRunIds.add(runId);
      resolveAwaiters(runId);
      return true;
    },
    awaitCancel(runId: string, signal?: AbortSignal) {
      if (requestedRunIds.has(runId)) {
        return Promise.resolve({ runId });
      }

      if (completedRunIds.has(runId)) {
        return new Promise<CancelNotice>(() => {});
      }

      return new Promise<CancelNotice>((resolve, reject) => {
        const awaiter: Awaiter = {
          resolve,
          reject,
          signal,
          abort: () => {
            removeAwaiter(runId, awaiter);
            reject(signal?.reason ?? new DOMException("Aborted", "AbortError"));
          },
        };
        const awaiters = awaitersByRunId.get(runId) ?? new Set<Awaiter>();

        awaiters.add(awaiter);
        awaitersByRunId.set(runId, awaiters);

        if (signal?.aborted) {
          awaiter.abort();
          return;
        }

        signal?.addEventListener("abort", awaiter.abort, { once: true });
      });
    },
    completeRun(runId: string) {
      completedRunIds.add(runId);
      requestedRunIds.delete(runId);
    },
  };
};

export const cancelCoordinator = createCancelCoordinator();
