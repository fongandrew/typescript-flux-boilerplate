TypeScript + Flux Boilerplate
=============================
This includes some boilerplate code for generating a single-page 
Flux + React app using Typescript, Webpack, and SASS, among other things.

Getting Started
---------------
Install [node](https://nodejs.org/download/) and 
[npm](http://blog.npmjs.org/post/85484771375/how-to-install-npm) 
if you haven't already.

`npm install` will run an initial install of node and bower requirements.

`npm run watch` will start a development server that monitors project 
directories and rebuilds the project as appropriate. By default, the
dev server will listen at http://localhost:8000/.

`npm run build` will bundle up various files in production mode and push them 
to the `dist` directory.

What's Included
---------------
* [Webpack](http://webpack.github.io/) - Webpack is used to manage 
  dependencies. Loaders for CSS, SCSS, and common fonts and image formats have 
  also been included, allowing you to use a NodeJS- / CommonJS-style 
  `require` to request static assets in addition to scripts. Webpack relies on 
  `require` to know which assets to add to the build. Be default, `src/index.js`
  serves as the entry point for all Webpack assets.

* [Webpack Dev Server](http://webpack.github.io/docs/webpack-dev-server.html) -
  The development server can be launched via `npm run watch` (or 
  `gulp watch`) and is configured to use Webpack's hot module reload.

* Typescript files are compiled using Webpack and 
  [TS Loader](https://github.com/jbrantly/ts-loader). This means you can use 
  Webpack requires in your Typescript. See the 
  [TypeScript handbook](http://www.typescriptlang.org/Handbook#modules-going-external)
  for more information on how to incorporate CommonJS modules into the app.

* [NTypesSript](https://github.com/TypeStrong/ntypescript) is used during the 
  compilation process rather than the latest offical build of TypeScript. This 
  permits the use of 
  [JSX in TypeScript files](http://www.jbrantly.com/typescript-and-jsx/) with a
  ".tsx" extension.

* [Bower](http://bower.io) - If you don't have  Bower installed globally, you 
  can run the package-specific version of Bower with 
  `npm run bower -- [bower commands here]`. Bower components are included via 
  a special auto-generated file (located at `./src/bower_reqs.js` by default) 
  that requires the "main" Bower files for Webpack to find. You can update this
  file by calling `gulp install-bower-reqs`. `gulp install-bower-reqs` will 
  respect any additions made to the `bower_reqs.js` file and will not re-add
  commented out `requires`. 

* [Gulp](http://gulpjs.com/) - Gulp 4.0 is used for various . See the
  `gulpfile.js` for info on specific tasks. If you don't have Gulp installed
  globally, you can run the package-specific version of Bower 
  with `npm run gulp -- [gulp task here]`. Note that Gulp 4.0 has not yet
  been released into NPM proper as of the time of this writing and includes
  some backwards-incompatible syntax with the current version of Gulp.

* Minification - CSS and JS files are minifed during a production build.

* Production Mode - The `PRODUCTION` boolean will be set to true in the
  Webpack-compiled TypeScript / JavaScript during a production build.

* Revision Hashes - A production build will append hashes to emitted
  JS, CSS, and other assets for cache-busting purposes.

* [SASS](http://sass-lang.com/) - Stylesheets are written using SASS. SCSS
  files will be compiled, bundled, and compressed during the build process.

* Source maps are included for bundled and compiled JS and CSS. The maps will
  have the same filename as their respective bundles, but with a `.js.map` or
  `.css.map` extension as appropriate.

What's Not Included
-------------------
* Linting - The `tslint.json`, `.jshintrc` files are included 
  to assist with TypeScript and JavaScript linting but a linter is not installed
  out of the box. If you want linting, you should enable this for your editor
  using whatever plugins or packages are necessary.

* [DefinitelyTyped / TSD](http://definitelytyped.org/tsd/) - A `tsd.json` file 
  and some basic typings are included but the TSD package manager itself is not 
  included. You can install it with `npm install -g tsd`.

Directory Structure / Files
----------------------------
This organizational structure can be adjusted by editing `config.js`

* `assets` - Where non-script and non-stylesheet assets go. Webpack will use
  this folder as a base path for resolving requirements.

* `bower_components` - This is where Bower will install its packages (and
  where Gulp expects to find files for bundling / distribution). To change
  this, add a [`.bowerrc` file](http://bower.io/docs/config/). Webpack will use
  this folder as a base path for resolving requirements.

* `dist` - Where Webpack builds the app.

* `src/ts` - Where all the TypeScript files go.

* `src/typings` - `ts.d` type definitions installed by DefinitelyTyped.
 
* `src/scss` - Where Gulp will look for SASS / SCSS files to compile.

* `src/index.js` - The entry point for Webpack to find all other assets. By
  default, `src/bower_reqs.js`, `src/ts/app.ts`, `src/scss/index.scss`,
  and `src/index.html` are required from this file. You should add all other 
  additional files to either the index or one of the files linked to by the 
  index, as appropriate.

* `src/bower_reqs.js` - An auto-generated file listing out requirements to
  the "main" files for Bower components.

* `src/index.html` - A template used by Webpack to generate an
  `index.html` file for the app. You can enclose references to assets
  with relative paths and double brackets (e.g. `[[../assets/favicon.ico]]`).
  You can also use asterisks as wildcards for generated asset names.

* `config.js` - Some basic variables to configure how Gulp and Webpack do
  their thing.

* `webpack.config.js` - Basic Webpack configuration, relies on `config.js`.

* `gulpfile.js` - Build tasks for gulp to run, relies on `config.js`.