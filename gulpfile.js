"use strict";

// NB: This gulp file is intended to be used with Gulp 4.0!

// For your configuration pleasure
var config = {
  // General src dir (to watch for reloads)
  srcDir: "./src",

  // The TS file(s) that requires all other TS files (i.e. the "main" or 
  // "index" files (relative to src)
  tsEntryPoint: "./src/ts/app.ts",

  // Where to look for SCSS files (relative to src)
  scssDir: "./src/scss",

  // Bower components directory
  bowerDir: "./bower_components",

  // Where builds go (generally)
  distDir: "./dist",

  // Directory for our generated Javascript
  distJSDir: "./dist/js",

  // Directory for our generated CSS
  distCssDir: "./dist/css",

  // Directory for fonts
  distFontsDir: "./dist/fonts",

  // Bower packages from which to exclude bundling (e.g. because we prefer to 
  // use the SASS build of a particular package)
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
    opener = require("opener"),
    path = require("path"),
    sass = require("gulp-sass"),
    source = require("vinyl-source-stream"),
    sourcemaps = require("gulp-sourcemaps"),
    rev = require("gulp-rev"),
    revReplace = require("gulp-rev-replace"),
    uglify = require("gulp-uglify");


// INSTALL ///////////////////////////

// Install bower components
var installBower = function() {
  return bower().pipe(gulp.dest(config.bowerDir));
};

// Run this after npm install
gulp.task("post-install", gulp.parallel(installBower));


// CLEAN ///////////////////////////

// NB: Leave folder patterns alone when doing a partial clean since removing
// a folder removes everything inside (both vendor and src). Do a full clean 
// when we want to clean up folder patterns.

gulp.task("clean-src-html", function(cb) {
  del([config.distDir + "/**/*.html"], cb);
});

gulp.task("clean-src-js", function(cb) {
  del([config.distDir + "/**/*.js",
       config.distDir + "/**/*.js.map",
       "!" + config.distDir + "/**/vendor*.*"], cb);
});

gulp.task("clean-src-css", function(cb) {
  del([config.distDir + "/**/*.css",
       config.distDir + "/**/*.css.map",
       "!" + config.distDir + "/**/vendor*.*"], cb);
});

gulp.task("clean-src", 
  gulp.parallel("clean-src-html", "clean-src-js", "clean-src-css"));

gulp.task("clean-vendor", function(cb) {
  del([config.distDir + "/**/vendor*.*",
       config.distFontsDir], cb);
});

// Clean everything => remove the directory rather than globbing our way
// through specific patterns
gulp.task("clean", function(cb) {
  del([config.distDir], cb);
});


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
    .pipe(gulp.dest(config.distJSDir))

    // Write manifest so HTML can update its references accordingly
    .pipe(rev.manifest("ts-manifest.json"))
    .pipe(gulp.dest(config.manifestsDir));
});

// Compile, concatenate, and minimize SASS/SCSS files with sourcemaps
gulp.task("build-sass", function() {
  return gulp.src(config.scssDir + "/**/*.scss", {base: config.scssDir})
    .pipe(sourcemaps.init())
    .pipe(sass())
    .pipe(autoprefixer())
    .pipe(concat("bundle.css"))
    .pipe(rev())                  // cache-buster
    .pipe(sourcemaps.write())

    // For some reason, minification + concat don't work well unless each
    // get their own sourcemap block
    .pipe(sourcemaps.init({loadMaps: true}))
    .pipe(minifyCss()).on("error", gutil.log)
    .pipe(sourcemaps.write("./"))
    .pipe(gulp.dest(config.distCssDir))

    // Write manifest so HTML can update its references accordingly
    .pipe(rev.manifest("sass-manifest.json"))
    .pipe(gulp.dest(config.manifestsDir));
});

gulp.task("build-src", gulp.series("clean-src", 
  gulp.parallel("build-ts", "build-sass")));

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
    .pipe(gulp.dest(config.distJSDir))

    // Write manifest so HTML can update its references accordingly
    .pipe(rev.manifest("vendor-js-manifest.json"))
    .pipe(gulp.dest(config.manifestsDir));
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
    .pipe(gulp.dest(config.distCssDir))

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
    .pipe(gulp.dest(config.distFontsDir));
});

gulp.task("build-vendor", gulp.series("clean-vendor", 
  gulp.parallel("build-bower-js", "build-bower-css", "build-bower-fonts")));


// Rewrite links in HTML files accordingly
gulp.task("build-html", function() {
  // Use the manifest for rewriting asset references (for cache-busting)
  var manifests = gulp.src(config.manifestsDir + "/**/*.json");

  return gulp.src(config.srcDir + "/**/*.html")
    .pipe(revReplace({manifest: manifests}))
    .pipe(gulp.dest(config.distDir))

    // Trigger live-reload
    .pipe(connect.reload());
});

gulp.task("build", gulp.series(
  gulp.parallel("build-src", "build-vendor"),
  "build-html"));


// WATCH ///////////////////////


gulp.task("watch-src", function() {
  return gulp.watch(config.srcDir + "/**/*.*", 
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
    root: config.distDir,
    port: config.port,
    livereload: true
  });
  opener("http://localhost:" + config.port);
  cb();
});

// For dev, do an initial build before opening and watching to live reload
gulp.task("dev", gulp.series("build", "open", "watch"));

gulp.task("default", gulp.series("dev"));
