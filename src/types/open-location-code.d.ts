declare module 'open-location-code' {
  
  export function encode(latitude: number, longitude: number, codeLength?: number): string;
  export function decode(code: string): {
    latitudeCenter: number;
    longitudeCenter: number;
    latitudeLo: number;
    latitudeHi: number;
    longitudeLo: number;
    longitudeHi: number;
    codeLength: number;
  };

  export class OpenLocationCode {
    constructor();
    encode(latitude: number, longitude: number, codeLength?: number): string;
    decode(code: string): ReturnType<typeof decode>;
  }

  const _default: typeof OpenLocationCode | {
    encode: typeof encode;
    decode: typeof decode;
  } | ((latitude: number, longitude: number, codeLength?: number) => string);

  export default _default;
}
