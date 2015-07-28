import rabbits = require("../collections/rabbits");
import dispatcher = require("../lib/dispatcher");

let AppDispatcher = dispatcher.dispatcher;

export function create(color: rabbits.Color): void {
  "use strict";

  let newRabbit = new rabbits.Rabbit(color);
  AppDispatcher.dispatch(new rabbits.Insert(newRabbit));
};

export function destroy(_id: string): void {
  "use strict";
  AppDispatcher.dispatch(new rabbits.Remove(_id));
};
