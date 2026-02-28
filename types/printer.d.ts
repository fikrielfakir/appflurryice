declare module 'react-native-ble-manager' {
  const BleManager: {
    start(options: { showAlert: boolean }): Promise<void>;
    stopScan(): Promise<void>;
    scan(uuids: string[], seconds: number, allowDuplicates: boolean): Promise<void>;
    connect(deviceId: string): Promise<void>;
    disconnect(deviceId: string): Promise<void>;
    retrieveServices(deviceId: string): Promise<any>;
    write(deviceId: string, serviceUUID: string, characteristicUUID: string, data: number[], maxByteSize: number): Promise<any>;
    addListener(event: string, callback: (data: any) => void): void;
    removeListeners(count: number): void;
  };
  export default BleManager;
}

declare module 'react-native-esc-pos-printer' {
  interface PrintOptions {
    encoding?: string;
    codepage?: number;
    widthTimes?: number;
    heightTimes?: number;
    fontType?: number;
  }

  interface InitOptions {
    width: number;
    deviceId: string;
  }

  const Printer: {
    init(options: InitOptions): Promise<void>;
    printText(text: string, options?: PrintOptions): Promise<void>;
    cut(): Promise<void>;
    partialCut(): Promise<void>;
  };
  export default Printer;
}
