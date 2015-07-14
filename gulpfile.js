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

  // Bower packages from which to exclude CSS bundling (e.g. because we prefer 
  // to use the SASS build of a particular package)
  cssExclude: [],

  // Directory for manifest files (used during HTML processing to write
  // hashed cached-busting paths). Sticking these in ./dist makes them
  // public but that's fine (and it automatically gets cleaned up)
  manifestsDir: "./dist/manifests",

  // Dev port (on localhost)
  port: 3000
};

/* global require: false */
var _ = require("lodash"),
    argv = require('yargs').argv,
    autoprefixer = require("gulp-autoprefixer"),
    browserify = require("browserify"),
    buffer = require("vinyl-buffer"),
    bower = require("gulp-bower"),
    concat = require("gulp-concat"),
    connect = require("gulp-connect"),
    del = require("del"),
    envify = require("envify/custom"),
    flatten = require("gulp-flatten"),
    gulp = require("gulp"),
    gutil = require("gulp-util"),
    mainBowerFiles = require("main-bower-files"),
    minifyCss = require("gulp-minify-css"),
    openBrowser = require("opener"),
    path = require("path"),
    sass = require("gulp-sass"),
    source = require("vinyl-source-stream"),
    sourcemaps = require("gulp-sourcemaps"),
    rev = require("gulp-rev"),
    revReplace = require("gulp-rev-replace"),
    uglify = require("gulp-uglify");

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
var installBower = function() {
  return bower().pipe(gulp.dest(inferred.bowerDir));
};

// Run this after npm install
gulp.task("post-install", gulp.parallel(installBower));


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

// Compile Typescript
gulp.task("build-ts", function() {
  var bundleName = path.basename(config.jsBundle);
  var bundleDir = path.dirname(config.jsBundle);

  // Env variables
  var envVars = {};
  if (argv.production) {
    envVars.NODE_ENV = "production";
  } else {
    envVars.NODE_ENV = "development";
  }

  // Browserify traces all requires from entry point
  // NB1: returning is crucial to things running in order
  // NB2: debug = true => sourcemaps
  return browserify(config.tsEntryPoint, {debug: true})    
    .plugin("tsify", { noImplicitAny: true })       // Typescript compilation
    .transform(envify(envVars))                     // Env variables
    .bundle()
    .on("error", gutil.log) // This is where Typescript errors get handled

    // Convert Browserify stream to Vinyl stream for gulp
    .pipe(source(bundleName))

    // Because both rev and sourcemaps need buffers isntead of streams        
    .pipe(buffer())

    // Rewrite names to bust caches on reload
    .pipe(rev())

    // Write sourcemaps for nicer debugging
    // loadMaps = true so we can load tsify sourcemaps
    .pipe(sourcemaps.init({loadMaps: true}))

    // Minimization
    .pipe(uglify()).on("error", gutil.log)

    // Write source map after uglify (which further modifies source maps)
    .pipe(sourcemaps.write("./"))

    // Write TS field
    .pipe(gulp.dest(bundleDir))

    // Write manifest so HTML can update its references accordingly
    .pipe(rev.manifest("ts-manifest.json"))
    .pipe(gulp.dest(config.manifestsDir));
});

// Compile, concatenate, and minimize SASS/SCSS files with sourcemaps
gulp.task("build-sass", function() {
  var bundleName = path.basename(config.cssBundle);
  var bundleDir = path.dirname(config.cssBundle);

  return gulp.src(config.scssDir + "/**/*.scss", {base: config.scssDir})
    .pipe(sourcemaps.init())
    .pipe(sass())
    .pipe(autoprefixer())
    .pipe(concat(bundleName))
    .pipe(rev())                  // cache-buster
    .pipe(sourcemaps.write())

    // For some reason, minification + concat don't work well unless each
    // get their own sourcemap block
    .pipe(sourcemaps.init({loadMaps: true}))
    .pipe(minifyCss()).on("error", gutil.log)
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

// Concatenate vendor js files from bower_components, minify, compile
// source maps and push
gulp.task("build-bower-js", function() {
  var bundleName = path.basename(config.vendorJsBundle);
  var bundleDir = path.dirname(config.vendorJsBundle);
  var jsFiles = mainBowerFiles({
    filter: "**/*.js"
  });
  return gulp.src(jsFiles, {base: inferred.bowerDir})
    // Concatenate files while preserving source map and add a version hash
    // for cache-busting purposes
    .pipe(sourcemaps.init())
    .pipe(concat(bundleName))
    .pipe(rev())
    .pipe(sourcemaps.write())

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

  // Pull CSS files from Bower but exclude those marked for exclusion
  var cssFiles = mainBowerFiles({
    filter: function(filepath) {
      if (/\.css$/.test(filepath)) {
        filepath = path.normalize(filepath);
        return !_.any(config.cssExclude, function(pkg) {
          var pattern = path.normalize(inferred.bowerDir + "/" + pkg);
          return _.contains(filepath, pattern);
        });
      }
    }
  });

  return gulp.src(cssFiles, {base: inferred.bowerDir})
    // Concatenate vendor.css into a single cache-busting bundle
    .pipe(sourcemaps.init())
    .pipe(concat(bundleName))
    .pipe(rev())
    .pipe(sourcemaps.write())

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
