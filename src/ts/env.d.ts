// Custom typing for just Node.js's process.env (used with envify)
// This isn't necessary if we use TSD to bring in the full Node.js type
// definitions
interface NodeJSProcess {
  env: any;
}

declare var process: NodeJSProcess;

