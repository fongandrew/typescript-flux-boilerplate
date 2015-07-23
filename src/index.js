// This is the entry point for Webpack. Require all files, JS or otherwise,
// that we want Webpack to bundle and to which there isn't a requirement path
// from an existing require.
/* jshint strict: false, unused: false */

// This causes Webpack to load everything in the assets dir during the build
var _req = require.context("../assets", true, /.*$/);

/* global requireAsset: true */
// Wrap the _req function so we don't need to use confusing relative paths
// and make it globally available (e.g. so we can access from TypeScript)
requireAsset = function(path) {
  return _req("./" + path);
};

// Auto-generated Bower file 
require('./bower_reqs.js');

// Main TypeScript app
require('./ts/app.ts');

// Stylesheets
require('./scss/index.scss');

// HTML entry points
require('./index.html');
