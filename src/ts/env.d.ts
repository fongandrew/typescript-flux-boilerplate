// Environment variables provided by Webpack
declare var PRODUCTION: boolean;

// requireAsset function defined in ../index.js 
declare function requireAsset(path: string): string;

// Declare any vars we want to add to Window
interface Window {
  React: any;
}



// declare var require: {
//   <T>(path: string): T;
//   (paths: string[], callback: (...modules: any[]) => void): void;
//   ensure: (paths: string[], callback: (require: <T>(path: string) => T) => void) => void;
// };
