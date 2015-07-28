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
declare var brownRabbit: rabbits.Rabbit;
brownRabbit = new rabbits.Rabbit(rabbits.Color.BROWN);

declare var grayRabbit: rabbits.Rabbit;
grayRabbit = new rabbits.Rabbit(rabbits.Color.GRAY);

declare var blackRabbit: rabbits.Rabbit;
blackRabbit = new rabbits.Rabbit(rabbits.Color.BLACK);

declare var RabbitStore: any;
RabbitStore = rabbits.store;

import dispatcher = require("./lib/dispatcher");
RabbitStore.addChangeListener(function(action: dispatcher.Action): void {
  console.log("Change 1!");
});
RabbitStore.addChangeListener(function(action: dispatcher.Action): void {
  console.log("Change 2!");
});

console.log("mark");

let AppDispatcher = dispatcher.dispatcher;

AppDispatcher.dispatch(new rabbits.Insert(brownRabbit));
AppDispatcher.dispatch(new rabbits.Insert(grayRabbit));
AppDispatcher.dispatch(new rabbits.Insert(blackRabbit));
AppDispatcher.dispatch(new rabbits.Update(grayRabbit._id, 
  function (old: rabbits.Rabbit): rabbits.Rabbit {
    console.log("Old: ", old);
    return old;
  }));
AppDispatcher.dispatch(new rabbits.Remove(brownRabbit._id));

// console.log(rabbits.store.insert(brownRabbit));
// console.log(rabbits.store.insert(new rabbits.Rabbit(rabbits.Color.BLACK)));
