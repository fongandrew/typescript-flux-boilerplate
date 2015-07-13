"use strict";

// NB: This gulp file is intended to be used with Gulp 4.0!

// For your configuration pleasure
var config = {
  // The TS file(s) that requires all other TS files (i.e. the "main" or 
  // "index" files
  tsEntryPoint: "./src/ts/app.ts",

  // Bower components directory
  bowerDir: "./bower_components",

  // General src dir
  src: "./src",

  // Where builds go
  dist: "./dist",

  // Subdirectory in build folder for bower-specific stuff
  // This only gets rebuilt when bower files get updated
  distVendor: "/vendor",

  // Subdirector in vendor folder for Javascript
  distJS: "/js",

  // Subdirector in vendor folder for stylesheets
  distCss: "/css",

  // Subdirector in vendor folder for fonts
  distFonts: "/fonts",

  // Dev port (on localhost)
  port: 3000,

  // Packages from which to exclude (e.g. because we prefer to use the SASS
  // build of a particular package)
  cssExclude: []
};

/* global require: false */
var _ = require("lodash"),
    path = require("path"),
    gulp = require("gulp"),
    browserify = require("browserify"),
    source = require("vinyl-source-stream"),
    buffer = require("vinyl-buffer"),
    concat = require("gulp-concat"),
    sourcemaps = require("gulp-sourcemaps"),
    envify = require("envify/custom"),
    del = require("del"),
    rev = require("gulp-rev"),
    revReplace = require("gulp-rev-replace"),
    gutil = require("gulp-util"),
    uglify = require("gulp-uglify"),
    connect = require("gulp-connect"),
    opener = require("opener"),
    bower = require("gulp-bower"),
    mainBowerFiles = require("main-bower-files"),
    minifyCss = require("gulp-minify-css"),
    flatten = require("gulp-flatten");


// INSTALL ///////////////////////////

// Install bower components
var installBower = function() {
  return bower().pipe(gulp.dest(config.bowerDir));
};

// Run this after npm install
gulp.task("post-install", gulp.parallel(installBower));


// CLEAN ///////////////////////////

gulp.task("clean-src", function(cb) {
  del([config.dist + "/**/*", 
       "!" + config.dist + config.distVendor,
       "!" + config.dist + config.distVendor + "/**/*"], cb);
});

gulp.task("clean-vendor", function(cb) {
  del(config.dist + config.distVendor, cb);
});

// Clean out old dist dir files
gulp.task("clean", gulp.parallel("clean-src", "clean-vendor"));


// BUILD //////////////////////////

// Compile Typescript
gulp.task("build-ts", function() {
  // Browserify traces all requires from entry point
  // NB1: returning is crucial to things running in order
  // NB2: debug = true => sourcemaps
  return browserify(config.tsEntryPoint, {debug: true})    
    .plugin("tsify", { noImplicitAny: true })       // Typescript compilation
    .transform(envify({NODE_ENV: "development"}))   // Env variables
    .bundle()
    .on("error", gutil.log) // This is where Typescript errors get handled

    // Convert Browserify stream to Vinyl stream for gulp
    .pipe(source("bundle.js"))

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
    .pipe(gulp.dest(config.dist))

    // Write manifest so HTML can update its references accordingly
    .pipe(rev.manifest("ts-manifest.json"))
    .pipe(gulp.dest(config.dist));
});

gulp.task("build-src", gulp.series("clean-src", "build-ts"));

// Concatenate vendor js files from bower_components, minify, compile
// source maps and push
gulp.task("build-bower-js", function() {
  var jsFiles = mainBowerFiles({
    filter: "**/*.js"
  });
  return gulp.src(jsFiles, {base: config.bowerDir})
    // Concatenate files while preserving source map and add a version hash
    // for cache-busting purposes
    .pipe(sourcemaps.init())
    .pipe(concat("vendor.js"))
    .pipe(rev())
    .pipe(sourcemaps.write())

    // For some reason concat + uglify doesn't prserve source maps unless each
    // is wrapped in their own sourcemaps block
    .pipe(sourcemaps.init({loadMaps: true}))
    .pipe(uglify()).on("error", gutil.log)
    .pipe(sourcemaps.write("./"))
    .pipe(gulp.dest(config.dist + config.distVendor + config.distJS))

    // Write manifest so HTML can update its references accordingly
    .pipe(rev.manifest("vendor-js-manifest.json"))
    .pipe(gulp.dest(config.dist + config.distVendor)); 
});

// Concatenate vendor css files from bower_components, minify and push
gulp.task("build-bower-css", function() {
  // Pull CSS files from Bower but exclude those marked for exclusion
  var cssFiles = mainBowerFiles({
    filter: function(filepath) {
      if (/\.css$/.test(filepath)) {
        filepath = path.normalize(filepath);
        return !_.any(config.cssExclude, function(pkg) {
          var pattern = path.normalize(config.bowerDir + "/" + pkg);
          return _.contains(filepath, pattern);
        });
      }
    }
  });

  return gulp.src(cssFiles, {base: config.bowerDir})
    // Concatenate vendor.css into a single cache-busting bundle
    .pipe(sourcemaps.init())
    .pipe(concat("vendor.css"))
    .pipe(rev())
    .pipe(sourcemaps.write())

    // For some reason, minification + concat don't work well unless each
    // get their own sourcemap block
    .pipe(sourcemaps.init({loadMaps: true}))
    .pipe(minifyCss()).on("error", gutil.log)
    .pipe(sourcemaps.write("./"))
    .pipe(gulp.dest(config.dist + config.distVendor + config.distCss))

    // Write manifest so HTML can update its references accordingly
    .pipe(rev.manifest("vendor-css-manifest.json"))
    .pipe(gulp.dest(config.dist + config.distVendor));
});

// Push Bower fonts to dist dir
gulp.task("build-bower-fonts", function() {
  var fontFiles = mainBowerFiles({
    filter: /\.(eot|woff|woff2|svg|ttf)$/
  });
  return gulp.src(fontFiles)
    .pipe(flatten())
    .pipe(gulp.dest(config.dist + config.distVendor + config.distFonts));
});

gulp.task("build-vendor", gulp.series("clean-vendor", 
  gulp.parallel("build-bower-js", "build-bower-css", "build-bower-fonts")));


// Rewrite links in HTML files accordingly
gulp.task("build-html", function() {
  // Use the manifest for rewriting asset references (for cache-busting)
  var tsManifest = gulp.src(config.dist + "/ts-manifest.json");
  var vendorJsManifest = gulp.src(
    config.dist + config.distVendor + "/vendor-js-manifest.json");
  var vendorCssManifest = gulp.src(
    config.dist + config.distVendor + "/vendor-css-manifest.json");

  return gulp.src(config.src + "/**/*.html")
    .pipe(revReplace({manifest: tsManifest}))
    .pipe(revReplace({manifest: vendorJsManifest}))
    .pipe(revReplace({manifest: vendorCssManifest}))
    .pipe(gulp.dest(config.dist))

    // Trigger live-reload
    .pipe(connect.reload());
});

gulp.task("build", gulp.series(
  gulp.parallel("build-src", "build-vendor"),
  "build-html"));


// WATCH ///////////////////////


gulp.task("watch-src", function() {
  return gulp.watch(config.src + "/**/*.*", 
    {debounceDelay: 1000},
    gulp.series("build-src", "build-html"));
});

gulp.task("watch-vendor", function() {
  return gulp.watch(config.bowerDir + "/**/bower.json", 
    {debounceDelay: 1000},
    gulp.series("build-vendor", "build-html"));
});

gulp.task("watch", gulp.parallel("watch-src", "watch-vendor"));

gulp.task("open", function(cb) {
  connect.server({
    root: config.dist,
    port: config.port,
    livereload: true
  });
  opener("http://localhost:" + config.port);
  cb();
});

// For dev, do an initial build before opening and watching to live reload
gulp.task("dev", gulp.series("build", "open", "watch"));

gulp.task("default", gulp.series("dev"));
