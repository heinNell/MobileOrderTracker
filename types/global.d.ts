// global.d.ts
import 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      // Allow any props for any HTML/React Native elements
      [elemName: string]: any;
    }
  }
}
