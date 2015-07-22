"use strict";
// NB: This gulp file is intended to be used with Gulp 4.0 and won't work with
// Gulp 3.x or below.

var _ = require("lodash"),
    argv = require("yargs").argv,
    bower = require("gulp-bower"),
    config = require("./config"),
    del = require("del"),
    fs = require("fs"),
    gulp = require("gulp"),
    gutil = require("gulp-util"),
    mainBowerFiles = require("main-bower-files"),
    // openBrowser = require("opener"),
    path = require("path"),
    webpack = require("webpack"),
    WebpackDevServer = require("webpack-dev-server");

// Override NODE_ENV if arguments call for it (this impacts webpack
// configuration)
process.env.NODE_ENV = (argv.production || "development");

// Install bower components
gulp.task("install-bower", function() {
  return bower().pipe(gulp.dest(config.bowerDir));
});

// Writes require statements of Bower's "main" files to config.vendorIndex 
// for Webpack to find. If config.vendorIndex does not exist, it will create
// a new file. Otherwise, it will append.
// 
// Does not remove any pre-existing content in file and will not re-add 
// requirements if commented out. This allows editing the output file 
// after generation but permit updates when new Bower packages are installed.
// 
// Webpack configuration: The require statements generated will be relative to
// config.bowerDir (or equivalent) and will require the files by their
// extension. Assumes resolve.extensions includes the blank '' extension and 
// that resolve.moduleDirectories or resolve.root points to config.bowerDir.
// 
gulp.task("install-bower-reqs", function(cb) {
  tryRead(config.vendorIndex, function(err, fileData) {
    if (err) { return cb(err); }

    // Get relative file paths for Bower and append
    var bowerDir = path.normalize(config.bowerDir);
    var bowerFiles = _.map(mainBowerFiles(), function(bowerFile) {
      var relPath = path.relative(bowerDir, path.normalize(bowerFile));

      // Normalize to Unix slashes on Windows
      if (path.sep === "\\") {
        relPath = relPath.replace(/\\/g, "/");
      }

      return relPath;
    });

    // Filter out paths that have already exist in the file as strings (this 
    // includes commented out file names as well)
    if (fileData) {
      bowerFiles = _.filter(bowerFiles, function(bowerFile) {
        var regex = new RegExp("(['\"])" + _.escapeRegExp(bowerFile) + "\\1");
        return !regex.test(fileData);
      });
    }

    // Add 'require' statements and write
    bowerFiles = _.map(bowerFiles, function(bowerFile) {
      return "require(\"" + bowerFile + "\");\n";
    });
    var content = bowerFiles.join("");

    // Add a comment if this is our first write
    if (! fileData) {
      content = (
        "// This file has been generated using a build script and the \"main\"\n" + 
        "// files from Bower packages. If you edit this file and rerun the script\n" +
        "// on this file, the script will preserve any added edits and will not\n" +
        "// re-add commented-out lines.\n\n"
      ) + content;
    }
    fs.appendFile(config.vendorIndex, content, cb);
  });
});

// Helper to try reading a file, returns empty string if doesn't exist
var tryRead = function(fn, cb) {
  fs.readFile(fn, function(err, res) {
    if (err) {
      if (err.code === "ENOENT") {
        res = "";
        err = null;
      }
    }
    cb(err, res);
  });
};

// Run this after npm install
gulp.task("install", gulp.series("install-bower", "install-bower-reqs"));

// Remove old installs
gulp.task("clean", function(cb) {
  del([config.distDir], cb);
});

// Base stat options for webpack (disables the everything true default)
var webpackStatOpts = {
  hash: false,
  version: false,
  timings: false,
  assets: false,
  chunks: false,
  chunkModules: false,
  modules: false,
  cached: false,
  reasons: false,
  source: false,
  errorDetails: false,
  chunkOrigins: false,
  colors: true
};

// Compiles app using Webpack
gulp.task("build-webpack", function(cb) {
  // Require config here AFTER env variable set above
  var wpConfig = require("./webpack.config.js");
  webpack(wpConfig, function(err, stats) {
    if (err) { throw new gutil.PluginError("webpack", err); }
    gutil.log("[webpack]", 
      stats.toString(_.extend({}, webpackStatOpts, {
        timings: true,
        assets: true,
        chunks: true,
        errorDetails: true
    })));

    // Callback error -- log will spit out actual useful info, so just insert
    // something here letting Gulp know things are amiss.
    var cbErr;
    if (stats.hasErrors() || stats.hasWarnings()) {
      cbErr = new gutil.PluginError("webpack", "Webpack errors ...");
    }
    cb(cbErr);
  });
});

// Resets dist directory, rebuilds
gulp.task("build", gulp.series("clean", "build-webpack"));

// Watch source for changes
gulp.task("watch", function() {
  process.env.WATCH_MODE = true;

  // Require config here AFTER env variable set above
  var wpConfig = require("./webpack.config.js");
  var compiler = webpack(wpConfig);
  new WebpackDevServer(compiler, {
    contentBase: config.distDir,
    stats: _.extend({}, webpackStatOpts, { 
      hash: true,
      timings: true,
      errorDetails: true
    })
  }).listen(config.devPort, "localhost", function(err) {
    if (err) {
      throw new gutil.PluginError("webpack-dev-server", err);
    }
    // Server listening
    gutil.log("[webpack-dev-server]", 
              "http://localhost:" + config.devPort + "/");
  });
});


// gulp.task("open", function(cb) {
//   connect.server({
//     root: config.distDir,
//     port: config.port,
//     livereload: true
//   });
//   openBrowser("http://localhost:" + config.port);
//   cb();
// });

// // For dev, do an initial build before opening and watching to live reload
// gulp.task("dev", gulp.series("build", "open", "watch"));

gulp.task("default", gulp.series("watch"));
