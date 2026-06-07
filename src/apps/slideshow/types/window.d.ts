declare global {
  interface Window {
    photoHelper: {
      getList(): Promise<string[]>;
    };
  }
}

export {};
