TypeScript + Flux Boilerplate
=============================
This includes some boilerplate code for generating a single-page(-ish) 
Flux + React app using Typescript, Browserify, and SASS, among other things.

Getting Started
---------------
Install [node](https://nodejs.org/download/) and 
[npm](http://blog.npmjs.org/post/85484771375/how-to-install-npm) 
if you haven't already.

`npm install` will run an initial install of node and bower requirements.

`npm run dev` will start a development server that monitors project directories
and rebuilds the project as appropriate.

`npm build` will bundle up various files and push them to the `dist` directory.

What's Included
---------------
* [Bower](http://bower.io) - Bower assets are concatenated, minified, and 
  written out to the `dist/vendor` directory as appropriate. If you don't have 
  Bower installed globally, you can run the package-specific version of Bower 
  with `npm run bower -- [bower commands here]`.
* Browserify - TypeScript files are compiled using Browserify and Tsify,
  meaning you can use NodeJS- / CommonJS-style `requires` in TypeScript.
  The build process will use `src/ts/app.ts` as the entry point for all
  Browserify requires. See the 
  [TypeScript handbook](http://www.typescriptlang.org/Handbook#modules-going-external)
  for more information on how to incorporate CommonJS modules into the app.
* [Gulp](http://gulpjs.com/) - Gulp 4.0 is used for the build process. See the
  `gulpfile.js` for info on specific tasks. If you don't have Gulp installed
  globally, you can run the package-specific version of Bower 
  with `npm run gulp -- [gulp task here]`. Note that Gulp 4.0 has not yet
  been released into NPM proper as of the time of this writing and includes
  some backwards-incompatible syntax with the current version of Gulp.
* Minification - CSS and JS files are minifed during the build process.
* NODE_ENV - Envify is used to set up a `process.env.NODE_ENV` variable equal
  to either "development" (when calling `npm run dev`) or "production" (when
  calling `npm build`).
* Revision Hashes - User-provided JS, CSS, and other assets will have a hash
  appended to their filenames during the build process for cache-busting 
  purposes. References to these assets from HTML files will be rewritten to
  include the appropriate hash. The mappings from the original filenames
  to the hashed name can be found in the `dist/manifests` directory after
  building.
* [SASS](http://sass-lang.com/) - Stylesheets are written using SASS. SCSS
  files will be compiled, bundled, and compressed during the build process.
* Source maps are included for bundled and compiled JS and CSS. The maps will
  have the same filename as their respective bundles, but with a `.js.map` or
  `.css.map` extension as appropriate.

What's Not Included
-------------------
* Linting - The `tsconfig.json`, `tslint.json`, `.jshintrc` files are included 
  to assist with TypeScript and JavaScript linting but a linter is not installed
  out of the box. If you want linting, you should enable this for your editor
  using whatever plugins or packages are necessary.
* LiveReload - LiveReload support is enabled on the server side, but you'll
  need to install a [browser extension](http://livereload.com/extensions/)
  for things to work.
* DefinitelyTyped / TSD - A `tsd.json` file and some basic typings are included
  but the TSD package manager itself is not included. You can install it with
  `npm install -g tsd`.

Directory Structure
-------------------
These directory options are the default. To change, take a look at the config
options in `gulpfile.js`.
* `src/ts` - Where all the TypeScript files go. The `app.ts` file is the main
  entry-point and should include all other TypeScript files as appropriate.
* `src/typings` - `ts.d` type definitions installed by DefinitelyTyped.
* `src/scss` - Where Gulp will look for SASS / SCSS files to compile.
* `assets` - Where Gulp will look for non-script / non-stylesheet assets
  to include into the `dist` directory.
* `dist` - Where Gulp builds the app.
* `bower_components` - This is where Bower will install its packages (and
  where Gulp expects to find files for bundling / distribution). To change
  this, add a [`.bowerrc` file](http://bower.io/docs/config/).