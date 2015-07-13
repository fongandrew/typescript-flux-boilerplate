"use strict";

// For your configuration pleasure
var config = {
  // The TS file(s) that requires all other TS files (i.e. the "main" or 
  // "index" files
  tsEntryPoint: "src/ts/app.ts",

  // Bower components directory
  bowerDir: "bower_components",

  // General src dir
  src: "./src",

  // Where builds go
  dist: "./dist",

  // Dev port (on localhost)
  port: 3000
};

/* global require: false */
var gulp = require("gulp"),
    browserify = require("browserify"),
    source = require("vinyl-source-stream"),
    buffer = require("vinyl-buffer"),
    sourcemaps = require("gulp-sourcemaps"),
    envify = require("envify/custom"),
    del = require("del"),
    rev = require("gulp-rev"),
    revReplace = require("gulp-rev-replace"),
    gutil = require("gulp-util"),
    uglify = require("gulp-uglify"),
    connect = require("gulp-connect"),
    opener = require("opener"),
    bower = require('gulp-bower');


////////////////////

gulp.task("default", ["watch"]);

// Clean out old dist dir files
gulp.task("clean", function() {
  // Sync to ensure this task is completed before other ones start (since
  // we don"t return a stream for gulp to wait on)
  del.sync(config.dist + "/*");
});

// Build and recompile everything
gulp.task("build", ["build-html"]);

// Copy index and update asset references
gulp.task("build-html", ["build-ts"], function() {

  // Use the manifest for rewriting asset references (for cache-busting)
  var manifest = gulp.src(config.dist + "/ts-manifest.json");

  return gulp.src(config.src + "/**/*.html")
    .pipe(revReplace({manifest: manifest}))
    .pipe(gulp.dest(config.dist))

    // Trigger live-reload
    .pipe(connect.reload());
});

// Compile Typescript
gulp.task("build-ts", ["clean"], function() {
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

// Watch and re-build
// Build pre-req so we do at least one build before watching
gulp.task("watch", ["build"], function() {
  gulp.watch(config.src + "/**/*.*", ["build"]);
  connect.server({
    root: config.dist,
    port: config.port,
    livereload: true
  });
  opener("http://localhost:" + config.port);
});

// Install bower components
gulp.task("bower", function() {
  return bower().pipe(gulp.dest(config.bowerDir));
});