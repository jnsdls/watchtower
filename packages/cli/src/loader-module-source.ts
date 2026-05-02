export type LoaderModuleSourceOptions = {
  readonly realSandcastleUrl: string;
  readonly wrapperRuntimeUrl: string;
};

export const createWrappedSandcastleModuleSource = ({
  realSandcastleUrl,
  wrapperRuntimeUrl,
}: LoaderModuleSourceOptions) => `
export * from ${JSON.stringify(realSandcastleUrl)};
import * as realSandcastle from ${JSON.stringify(realSandcastleUrl)};
import { wrapForLoader } from ${JSON.stringify(wrapperRuntimeUrl)};

const wrappedSandcastle = wrapForLoader(realSandcastle);

export const run = wrappedSandcastle.run;
export const createSandbox = wrappedSandcastle.createSandbox;
`;
