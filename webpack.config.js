'use strict';
var _ = require('lodash');
var webpack = require('webpack');
var path = require('path');
var config = require('./config');

// Are we in production mode?
var production = (process.env.NODE_ENV === 'production');

// Are we in watch mode?
var watchMode = process.env.WATCH_MODE;

// BASIC WEBPACK CONFIG OBJECT ///////////////////////////

var wpConfig = {

  // Entry points are files require-ing all other files
  entry: (watchMode ? ["webpack/hot/dev-server"] : [])
          .concat(["./" + config.entry]),

  output: {
    path: path.resolve(config.distDir),
    filename: 'bundle' + (production ? '-[hash:12]' : '') + '.js'
  },

  resolve: {
     modulesDirectories: [
      'node_modules',
      config.srcDir,
      config.assetsDir,
      config.bowerDir
    ],

    extensions: ['', '.ts', '.tsx', '.js', '.jsx']
  },

  devtool: 'source-map',

  // Set below
  module: {loaders: []},
  plugins: []
};


// FILETYPE LOADERS /////////////////////////////////////////

// Configure loaders based on file extensions
var addLoader = function(ext, loaders, extra) {
  if (_.isString(ext)) {
    ext = new RegExp("\\." + ext + "(\\?.*)?$");
  }
  loaders = _.isArray(loaders) ? loaders.join("!") : loaders;
  extra = extra || {};
  wpConfig.module.loaders.push(_.extend({}, {
    test: ext,
    loader: loaders}));
};

// Typescript
var tsLoader = 'ts-loader?compiler=ntypescript';
addLoader('ts' , [tsLoader]);
addLoader('tsx' , [tsLoader]);

// Stylesheets
// Extract CSS files into separate files for source-mapping purposes
var ExtractTextPlugin = require("extract-text-webpack-plugin");
var cssBundle = 'bundle' + (production ? '-[contenthash:12]' : '') + '.css';
var extractPlugin = new ExtractTextPlugin(cssBundle, {allChunks: true});
wpConfig.plugins.push(extractPlugin);

var addExtract = function(ext, loaders, extra) {
  loaders = loaders.join("!");
  addLoader(ext, extractPlugin.extract("style-loader", loaders), extra);
};
var autoprefixer = "autoprefixer";
if (config.autoprefixerOpts) { autoprefixer += "?" + config.autoprefixerOpts; } 
var cssLoader = "css?sourceMap" + (production ? "&minimize" : "");
var sassLoader = "sass?sourceMap&includePaths[]=" + 
  path.resolve(config.bowerDir);

addExtract("scss", [cssLoader, autoprefixer, sassLoader]);
addExtract("css", [cssLoader, autoprefixer]);

// Static assets
var fileLoader = "file?name=assets/[name]-[hash:12].[ext]";
addLoader("gif",   fileLoader + "&mimetype=image/gif");
addLoader("jpg",   fileLoader + "&mimetype=image/jpg");
addLoader("png",   fileLoader + "&mimetype=image/png");
addLoader("woff",  fileLoader + "&mimetype=application/font-woff");
addLoader("woff2", fileLoader + "&mimetype=application/font-woff2");
addLoader("ttf",   fileLoader + "&mimetype=application/vnd.ms-fontobject");
addLoader("eot",   fileLoader + "&mimetype=application/x-font-ttf");
addLoader("svg",   fileLoader + "&mimetype=image/svg+xml");

// Favicon - preserve at root
addLoader(/\.ico$/, "file?name=[name].[ext]&mimetype=image/x-icon");

// HTML
var PathRewriterPlugin = require('webpack-path-rewriter');
var emitOptions = {
  name: "[path][name].html",
  context: config.srcDir
};
if (watchMode) {
  emitOptions.loader = "replace?flags=i&regex=<body>&sub=<body>" +
                       "<script src=\"http://localhost:" + config.devPort + 
                       "/webpack-dev-server.js\"></script>";
}
addLoader("html", PathRewriterPlugin.rewriteAndEmit(emitOptions));
wpConfig.plugins.push(new PathRewriterPlugin({includeHash: true, 
                                              emitStats: false  }));


// MISC PLUGINS //////////////////////

// Custom variable in Javascript based on environment
wpConfig.plugins.push(new webpack.DefinePlugin({
  PRODUCTION: production
}));

// Add HMR module
if (watchMode) {
  wpConfig.plugins.push(new webpack.HotModuleReplacementPlugin());
}

// Minify our Javascript in production
if (production) {
  wpConfig.plugins.push(new webpack.optimize.UglifyJsPlugin({
    // Disable warnings about un-reachable conditions and what not. Most
    // of those are intentional (e.g. via webpack.DefinePlugin)
    compress: {warnings: false}
  }));  
}

// Export for Webpack to find
module.exports = wpConfig;
