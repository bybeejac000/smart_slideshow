declare global {
  interface Window {
    photoHelper: {
      getList(): Promise<string[]>;
    };
    getEnvVar(key: string): string | null;
    QRCode: new (
      el: HTMLElement,
      options: {
        text: string;
        width?: number;
        height?: number;
        colorDark?: string;
        colorLight?: string;
      },
    ) => void;
  }
}

export {};
