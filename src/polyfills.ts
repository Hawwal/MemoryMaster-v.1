// Browser polyfills for Solana and wallet compatibility
import { Buffer } from 'buffer';
import process from 'process';

declare global {
  interface Window {
      ethereum?: any;
  }
}

// Global Buffer polyfill
if (!window.Buffer) {
  window.Buffer = Buffer;
  window.process = process;
}


// Global polyfill
if (typeof globalThis !== 'undefined') {
  globalThis.Buffer = Buffer;
  globalThis.process = process;
  if (!globalThis.global) {
    globalThis.global = globalThis;
  }
}


// Polyfill for toformat and big number libraries
if (typeof BigInt === 'undefined') {
    window.BigInt = Object.assign(
      function(value: string | number | bigint | boolean) {
        return parseInt(value as string, 10);
      },
      {
        asIntN: (bits: number, int: bigint) => int,
        asUintN: (bits: number, int: bigint) => int,
      }
    ) as unknown as BigIntConstructor;
  }
export default {}; 