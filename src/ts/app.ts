/// <reference path="./env.d.ts" />
/// <reference path="../typings/tsd.d.ts" />

// Make React global on the wndow (helps React dev tools interact with app)
import React = require("react");
window.React = React;

// Render our root page
import IndexPage = require("./components/index_page");
React.render(
  React.createElement(IndexPage),
  document.body);
