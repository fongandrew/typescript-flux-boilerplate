/// <reference path="./env.d.ts" />
/// <reference path="../typings/tsd.d.ts" />
import shapes = require("./shapes");
declare var t: shapes.Triangle,
            t2: shapes.Triangle,
            s: shapes.Rectangle;
t = new shapes.Triangle();
t2 = new shapes.Triangle();
s = new shapes.Square(10);

let mode: string = (PRODUCTION ? "production" : "development");
console.log("Running in " + mode + " mode");

declare var gogogo: () => void;
gogogo = function(): void {
  $("body").text("Go go gadget!");
};

// Make React global on the wndow (helps React dev tools interact with app)
import React = require("react");
window.React = React;

// Render our root page
import IndexPage = require("./components/index_page");
React.render(
  React.createElement(IndexPage),
  document.body);
