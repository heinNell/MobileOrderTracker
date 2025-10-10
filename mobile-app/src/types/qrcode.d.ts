declare module 'qrcode' {
  export function toDataURL(text: string, options?: any): Promise<string>;
  export function toString(text: string, options?: any): Promise<string>;
  export function toFile(path: string, text: string, options?: any): Promise<void>;
  export function toCanvas(canvasElement: any, text: string, options?: any): Promise<any>;
  export function toBuffer(text: string, options?: any): Promise<Buffer>;
}
