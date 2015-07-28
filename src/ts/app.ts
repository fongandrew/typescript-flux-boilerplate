/// <reference path="./env.d.ts" />
/// <reference path="../typings/tsd.d.ts" />

// Make React global on the wndow (helps React dev tools interact with app)
import React = require("react");
window.React = React;

// Render our root page
import IndexPage = require("./components/index-page");
React.render(
  React.createElement(IndexPage),
  document.body);

import rabbits = require("./collections/rabbits");
import rabbitActions = require("./actions/rabbit-actions");

declare var RabbitStore: any;
RabbitStore = rabbits.store;

rabbitActions.create(rabbits.Color.BROWN);
rabbitActions.create(rabbits.Color.BLACK);
rabbitActions.create(rabbits.Color.GRAY);
