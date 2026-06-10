declare global {
  interface Window {
    photoHelper: {
      getList(): Promise<string[]>;
    };
    getEnvVar(key: string): string | null;
  }
}

export {};
