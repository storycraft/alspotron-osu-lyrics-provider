export type ServerInjector = {
  inject(dllFile: string): number;
};

// require inside or dynamic import deadlock lol wat
export const getInjector: () => ServerInjector = () => require('../index.node') as ServerInjector;
