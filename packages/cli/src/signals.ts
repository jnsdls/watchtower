type ProcessLike = {
  readonly on: (event: "SIGINT", listener: () => void) => void;
  readonly off: (event: "SIGINT", listener: () => void) => void;
  readonly exit: (code: number) => never;
};

export type SigintHandlerOptions = {
  readonly abortActiveRuns: (reason: string) => void;
  readonly onFirstSignal?: () => void;
  readonly exit?: (code: number) => void;
};

export const createSigintHandler = ({
  abortActiveRuns,
  exit = (code) => process.exit(code),
  onFirstSignal,
}: SigintHandlerOptions) => {
  let didStartGracefulCancel = false;

  return () => {
    if (didStartGracefulCancel) {
      exit(130);
      return;
    }

    didStartGracefulCancel = true;
    onFirstSignal?.();
    abortActiveRuns("SIGINT");
  };
};

export const installSigintHandler = (
  options: SigintHandlerOptions,
  processLike: ProcessLike = process,
) => {
  const handler = createSigintHandler(options);
  processLike.on("SIGINT", handler);

  return () => {
    processLike.off("SIGINT", handler);
  };
};
