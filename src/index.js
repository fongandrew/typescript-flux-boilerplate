// This is the entry point for Webpack. Require all assets, JS or otherwise,
// that we want Webpack to bundle and to which there isn't a requirement path
// from an existing require.
require('./bower_reqs.js');
require('./ts/app.ts');
require('./scss/index.scss');

require('./index.html');