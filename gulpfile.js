"use strict";

// NB: This gulp file is intended to be used with Gulp 4.0!

// For your configuration pleasure
// * NO TRAILING SLASH on filenames.
// * Use forward slashes (/) even for Windows paths
// * Best to keep paths relative to this file
var config = {
  // Where to watch for HTML files
  htmlDir: "./src",

  // Where to watch for Typescript files, generally
  tsDir: "./src/ts",

  // The TS file(s) that requires all other TS files (i.e. the "main" or 
  // "index" files (relative to src)
  tsEntryPoint: "./src/ts/app.ts",

  // Where to look for SASS/SCSS files
  scssDir: "./src/scss",

  // Where to find non-script / stylesheet assets
  assetsDir: "./assets",

  // Where builds go (generally)
  distDir: "./dist",

  // Path for app's bundled Javascript / Typescript
  jsBundle: "./dist/bundle.js",

  // Path for app's bundled CSS / SCSS
  cssBundle: "./dist/bundle.css",

  // Path for bundled JS and CSS from bower components
  vendorJsBundle: "./dist/vendor/js/vendor-bundle.js",
  vendorCssBundle: "./dist/vendor/css/vendor-bundle.css",

  // Path for fonts from bower components
  vendorFontsDir: "./dist/vendor/fonts",

  // Glob patterns for identiyfing generated vendorfiles
  vendorPatterns: ["./dist/vendor", "./dist/vendor/**/*.*"],

  // Bower's main files aren't always super accurate. We can customize which JS
  // files get included (or don't get included) by specifying an array of paths
  // relative to the Bower package's root.
  customVendorJs: {
    // e.g. this includes additional JS files from bootstrap
    // "bootstrap-sass-official": ["assets/javascripts/bootstrap.js",
    //                             "assets/javascripts/bootstrap-sprockets.js"]
  },

  // Same as above, but for CSS
  customVendorCss: {
    // e.g. this excludes all CSS from fontawesome (useful if we want to
    // compile SASS directly ourselves)
    // fontawesome: []
  },

  // Directory for manifest files (used during HTML processing to write
  // hashed cached-busting paths). Sticking these in ./dist makes them
  // public but that's fine (and it automatically gets cleaned up)
  manifestsDir: "./dist/manifests",

  // Dev port (on localhost)
  port: 3000
};

/* global require: false */
var _ = require("lodash"),
    argv = require("yargs").argv,
    autoprefixer = require("gulp-autoprefixer"),
    buffer = require("vinyl-buffer"),
    bower = require("gulp-bower"),
    concat = require("gulp-concat"),
    connect = require("gulp-connect"),
    del = require("del"),
    envify = require("envify/custom"),
    flatten = require("gulp-flatten"),
    fs = require("fs"),
    gulp = require("gulp"),
    glob = require("glob"),
    gutil = require("gulp-util"),
    mainBowerFiles = require("main-bower-files"),
    minifyCss = require("gulp-minify-css"),
    mkdirp = require("mkdirp"),
    openBrowser = require("opener"),
    path = require("path"),
    sass = require("node-sass"),
    source = require("vinyl-source-stream"),
    sourcemaps = require("gulp-sourcemaps"),
    rev = require("gulp-rev"),
    revReplace = require("gulp-rev-replace"),
    uglify = require("gulp-uglify"),
    webpack = require("webpack");

// Infer some other vars from related files
var inferred = (function() {
  var ret = {};

  // Get bower components dir
  var bowerRc;
  try {
    bowerRc = require("./.bowerrc");
  } catch (err) {
    // Do nothing -> absence of .bowerrc means we default to bower_components
  }

  if (bowerRc && bowerRc.path) {
    ret.bowerDir = bowerRc.path;
  } else {
    ret.bowerDir = "bower_components";
  }

  // Get TSD path
  var tsdJson;
  try {
    tsdJson = require("./tsd.json");
  } catch (err) {
    console.error("Error importing tsd.json, " + err);
  }
  if (tsdJson) {
    if (! tsdJson.path) {
      console.error("tsd.json is missing path");
    } else {
      ret.typingsDir = tsdJson.path;
    }
  }

  return ret;
})();



// INSTALL ///////////////////////////

// Install bower components
gulp.task("install-bower", function() {
  return bower().pipe(gulp.dest(inferred.bowerDir));
});

// Run this after npm install
gulp.task("install", gulp.parallel("install-bower"));


// CLEAN ///////////////////////////

// NB: Leave folder patterns alone when doing a partial clean since removing
// a folder removes everything inside (both vendor and src). Do a full clean 
// when we want to clean up folder patterns.

// Invert vendor patterns to exclude deleting vendor files when we're cleaning
// our own JS, etc.
var notVendor = _.map(config.vendorPatterns, 
  function(pattern) {
    return "!" + pattern;
  });

/** Helper to return extensions of a certain file type in out dist dir that's
 *  not supplied by a vendor.
 *  @param {[string]} exts - List of extensions. If extension is preceded
 *    by a "!", then the extension will be excluded from the list.
 */
var distExt = function(exts) {
  return _.map(exts, function(ext) {
    if (ext[0] === "!") {
      ext = ext.slice(1);
      return "!" + config.distDir + "/**/*." + ext;
    }
    return config.distDir + "/**/*." + ext;
  }).concat(notVendor);
};

gulp.task("clean-html", function(cb) {
  del(distExt(["html"]), cb);
});

gulp.task("clean-js", function(cb) {
  del(distExt(["js", "js.map"]), cb);
});

gulp.task("clean-css", function(cb) {
  del(distExt(["css", "css.map"]), cb);
});

gulp.task("clean-vendor", function(cb) {
  del(config.vendorPatterns, cb);
});

gulp.task("clean-assets", function(cb) {
  // Asset patterns = inverse of everything else
  var patterns = distExt(["*", "!html", "!js", "!css", "!map"]);
  patterns.push("!" + config.manifestsDir + "/**/*.json");
  del(patterns, cb);
});

// Clean everything => remove the directory rather than globbing our way
// through specific patterns
gulp.task("clean", function(cb) {
  del([config.distDir], cb);
});


// BUILD //////////////////////////

// Compile TypesScript using Webpack
// 
// We're only using Webpack to compile our initial JS bundle prior to running
// some Gulp transformations, rather than using its full set of loaders and 
// import capabilities. This makes it a little more straight-forward to do
// things like bundle up all of our Bower assets without having to explicitly
// require them. Ideally, we actually use Browserify for this because it's more
// lightweight and "stream-y", but JSX support is a little better over with 
// Webpack right now.
// 
// TODO: May want to switch to using Webpack dev server for faster rebuilds
// 
gulp.task("build-ts", function(cb) {
  var bundleName = path.basename(config.jsBundle, ".js");
  var bundleDir = path.dirname(config.jsBundle);

  // Env variables
  var envVars = {};
  if (argv.production) {
    envVars.NODE_ENV = "production";
  } else {
    envVars.NODE_ENV = "development";
  }

  webpack({
    entry: {app: config.tsEntryPoint},

    resolve: {
      extensions: ["", ".ts", ".tsx", ".webpack.js", ".web.js", ".js"]
    },

    // Inline because we'll be using Gulp to rewrite source maps
    devtool: "source-map",

    output: {
      path: bundleDir,
      filename: bundleName + "-[hash].js"
      //filename: bundleName + ".js"
    },

    module: {
      loaders: [
        { test: /\.ts(x?)$/, 
          loader: "transform/cacheable?0!awesome-typescript-loader" }
      ]
    },

    transforms: [envify(envVars)],
    plugins: [new webpack.optimize.UglifyJsPlugin()]
  }, 

  function(err, stats) {
    if (err) { 
      cb(new gutil.PluginError("webpack", err)); 
      return;
    }

    var manifest = {};
    manifest[bundleName + ".js"] = stats.toJson().assetsByChunkName.app[0];

    // Ensure directory exists before writing
    mkdirp(config.manifestsDir, function(mkdirErr) {
      if (mkdirErr) {
        cb(new gutil.PluginError("webpack", mkdirErr));
        return;
      }

      // Write manifest to file
      fs.writeFile(config.manifestsDir + "/" + "ts-manifest.json",
        JSON.stringify(manifest),
        function (writeErr) {
          if (writeErr) {
            cb(new gutil.PluginError("webpack", writeErr));
          } else {
            cb();
          }
        });
    });
  });
});

// Returns a Gulp stream with concatenated and compiled SASS files
// This writes source maps better than relying on gulp-sass, gulp-concat, and 
// gulp-minify-css do.
var sassConcat = function(base, bundleName, sassOpts) {
  var stream = source(bundleName);

  // Helper that returns true if no error, emits error and ends stream if
  // there is an error passed
  var errOk = function(err) {
    if (err) {
      stream.emit("error", new gutil.PluginError("sassConcat", err));
      stream.end();
    }
    return !err;
  };

  // Glob the filenames we need
  glob(base + "/**/*.scss", function(globErr, filenames) {
    if (errOk(globErr)) {
      // Filter out partials
      filenames = _.filter(filenames, function(fn) {
        return path.basename(fn)[0] !== "_";
      });

      // Construct SASS imports with paths relative to base
      filenames = _.map(filenames, function(fn) {
        var relPath = path.relative(base, fn).replace("\\", "/");
        return "@import \"" + relPath + "\";";
      });

      // Buffer a special SASS file that imports everything
      sassOpts = sassOpts || {};
      sassOpts.data = filenames.join("\n");
      sassOpts.includePaths = sassOpts.includePaths || [];
      sassOpts.includePaths.push(base);

      // Render to stream
      sass.render(sassOpts, function(sassErr, sassRes) {
        if (errOk(sassErr)) {
          stream.end(sassRes.css);
        }
      });
    }
  });

  return stream;
};

gulp.task("build-sass", function() {
  var bundleName = path.basename(config.cssBundle);
  var bundleDir = path.dirname(config.cssBundle);

  return sassConcat(config.scssDir, bundleName, {
      sourceMap: bundleName + ".map",
      sourceMapContents: true,
      sourceMapEmbed: true,
      outputStyle: "compressed",
      includePaths: [inferred.bowerDir]})
    
    // Sourcemaps needs buffer
    .pipe(buffer())

    // Additional Gulp-y transformations not handled by SASS directly
    .pipe(sourcemaps.init({loadMaps: true}))
    .pipe(autoprefixer())           // browser-prefixes
    .pipe(rev())                    // cache-buster
    .pipe(sourcemaps.write("./"))
    .pipe(gulp.dest(bundleDir))

    // Write manifest so HTML can update its references accordingly
    .pipe(rev.manifest("sass-manifest.json"))
    .pipe(gulp.dest(config.manifestsDir));
});

// Copy assets over to dist, use a rev hash to cache-bust
gulp.task("build-assets", function() {
  return gulp.src(config.assetsDir + "/**/*.*")
    .pipe(rev())
    .pipe(gulp.dest(config.distDir))
    .pipe(rev.manifest("assets-manifest.json"))
    .pipe(gulp.dest(config.manifestsDir));
});

// Helper for extracting only the Bower files we want - takes an extension
// and a package map (e.g. config.customVendorJs) telling which relative
// paths to include for this extension. Removes duplicates and minimized
// versions of files.
var bowerFiles = function(ext, pkgMap) {
  // Gets files based on main
  var files = mainBowerFiles({
    filter: function(filepath) {
      // Check that last X chars match ext but NOT min extension
      if (filepath.slice(-(ext.length + 1)) !== "." + ext ||
          filepath.slice(-(ext.length + 5)) === ".min." + ext) {
        return false;
      }

      if (! pkgMap) {
        return true;
      }

      // Get the package name for this path
      var relBower = path.relative(
        path.normalize(inferred.bowerDir),
        path.normalize(filepath));
      var pkgName = relBower.split(path.sep)[0];

      // Exclude if in package map
      return !pkgMap[pkgName];
    }
  });

  // Add on files from pkgMap in absolute path form to be consistent with
  // mainBowerFiles
  var pkgMapFiles = _.flatten(
    _.map(pkgMap, function(pkgPaths, pkgName) {
      return _.map(pkgPaths, function(pkgPath) {
        pkgPath = [inferred.bowerDir, pkgName, pkgPath].join("/");
        return path.resolve(pkgPath);
      });
    }));
  files = files.concat(pkgMapFiles);

  // Remove duplicates and return
  return _.uniq(files);
};

// Concatenate vendor js files from bower_components, minify, compile
// source maps and push
gulp.task("build-bower-js", function() {
  var bundleName = path.basename(config.vendorJsBundle);
  var bundleDir = path.dirname(config.vendorJsBundle);
  var jsFiles = bowerFiles("js", config.customVendorJs);

  return gulp.src(jsFiles, {base: inferred.bowerDir})
    // Concatenate files while preserving source map and add a version hash
    // for cache-busting purposes
    .pipe(sourcemaps.init())
    .pipe(concat(bundleName))
    .pipe(rev())
    .pipe(sourcemaps.write({sourceRoot: inferred.bowerDir}))

    // For some reason concat + uglify doesn't prserve source maps unless each
    // is wrapped in their own sourcemaps block
    .pipe(sourcemaps.init({loadMaps: true}))
    .pipe(uglify()).on("error", gutil.log)
    .pipe(sourcemaps.write("./"))
    .pipe(gulp.dest(bundleDir))

    // Write manifest so HTML can update its references accordingly
    .pipe(rev.manifest("vendor-js-manifest.json"))
    .pipe(gulp.dest(config.manifestsDir));
});

// Concatenate vendor css files from bower_components, minify and push
gulp.task("build-bower-css", function() {
  var bundleName = path.basename(config.vendorCssBundle);
  var bundleDir = path.dirname(config.vendorCssBundle);
  var cssFiles = bowerFiles("css", config.customVendorCss);

  return gulp.src(cssFiles, {base: inferred.bowerDir})
    // Concatenate vendor.css into a single cache-busting bundle
    .pipe(sourcemaps.init())
    .pipe(concat(bundleName))
    .pipe(rev())
    .pipe(sourcemaps.write({sourceRoot: inferred.bowerDir}))

    // For some reason, minification + concat don't work well unless each
    // get their own sourcemap block
    .pipe(sourcemaps.init({loadMaps: true}))
    .pipe(minifyCss()).on("error", gutil.log)
    .pipe(sourcemaps.write("./"))
    .pipe(gulp.dest(bundleDir))

    // Write manifest so HTML can update its references accordingly
    .pipe(rev.manifest("vendor-css-manifest.json"))
    .pipe(gulp.dest(config.manifestsDir));
});

// Push Bower fonts to dist dir
gulp.task("build-bower-fonts", function() {
  var fontFiles = mainBowerFiles({
    filter: /\.(eot|woff|woff2|svg|ttf)$/
  });
  return gulp.src(fontFiles)
    .pipe(flatten())
    .pipe(gulp.dest(config.vendorFontsDir));
});

gulp.task("build-vendor",
  gulp.parallel("build-bower-js", "build-bower-css", "build-bower-fonts"));


// Rewrite links in HTML files accordingly
gulp.task("build-html", function() {
  // Use the manifest for rewriting asset references (for cache-busting)
  var manifests = gulp.src(config.manifestsDir + "/**/*.json");

  return gulp.src(config.htmlDir + "/**/*.html")
    .pipe(revReplace({manifest: manifests}))
    .pipe(gulp.dest(config.distDir))

    // Trigger live-reload
    .pipe(connect.reload());
});

// Build everything
gulp.task("build", gulp.series(
  "clean",
  gulp.parallel("build-ts", "build-sass", "build-assets", "build-vendor"),
  "build-html"));


// WATCH ///////////////////////

gulp.task("watch-ts", function() {
  // Watch main TS dir for changes
  var tsPaths = [config.tsDir];

  // Watch TSD directory for compilation
  if (inferred.typingsDir) {
    tsPaths.push(inferred.typingsDir);
  }

  // Glob to find files in directories
  tsPaths = _.map(tsPaths, function(p) {
    return p + "/**/*.ts";
  });
  
  return gulp.watch(tsPaths, 
    {debounceDelay: 1000},
    gulp.series("clean-js", "build-ts", "build-html"));
});

gulp.task("watch-sass", function() {
  return gulp.watch(config.scssDir + "/**/*.*", 
    {debounceDelay: 1000},
    gulp.series("clean-css", "build-sass", "build-html"));
});

gulp.task("watch-vendor", function() {
  return gulp.watch(inferred.bowerDir + "/**/.bower.json", 
    {debounceDelay: 1000},
    gulp.series("clean-vendor", "build-vendor", "build-html"));
});

gulp.task("watch-assets", function() {
  return gulp.watch(config.assetsDir + "/**/*.*", 
    {debounceDelay: 1000},
    gulp.series("clean-assets", "build-assets", "build-html"));
});

gulp.task("watch-html", function() {
  return gulp.watch(config.htmlDir + "/**/*.html", 
    {debounceDelay: 1000},
    gulp.series("clean-html", "build-html"));
});

gulp.task("watch",
  gulp.parallel("watch-ts", 
                "watch-sass", 
                "watch-vendor", 
                "watch-assets", 
                "watch-html"));

gulp.task("open", function(cb) {
  connect.server({
    root: config.distDir,
    port: config.port,
    livereload: true
  });
  openBrowser("http://localhost:" + config.port);
  cb();
});

// For dev, do an initial build before opening and watching to live reload
gulp.task("dev", gulp.series("build", "open", "watch"));

gulp.task("default", gulp.series("dev"));
