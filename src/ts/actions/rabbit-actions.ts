import rabbits = require("../collections/rabbits");
import store = require("../lib/store");
import dispatcher = require("../lib/dispatcher");

let AppDispatcher = dispatcher.dispatcher;
let DataStatus = store.DataStatus;

export function create(color: rabbits.Color): void {
  "use strict";

  let newRabbit = new rabbits.Rabbit(color, DataStatus.INFLIGHT);
  AppDispatcher.dispatch(new rabbits.Insert(newRabbit));

  // Simulate JSON callback
  setTimeout(function() {
    AppDispatcher.dispatch(new rabbits.Update(
      newRabbit._id, function(rabbit: rabbits.Rabbit): rabbits.Rabbit {
        rabbit.dataStatus = DataStatus.READY;
        return rabbit;
      }));
  }, 1200);
 };

export function destroy(_id: string): void {
  "use strict";

  AppDispatcher.dispatch(new rabbits.Update(_id, 
    function(rabbit: rabbits.Rabbit): rabbits.Rabbit {
      rabbit.dataStatus = DataStatus.INFLIGHT;
      return rabbit;
    }));

  // Simulate JSON callback
  setTimeout(function() {
    AppDispatcher.dispatch(new rabbits.Remove(_id));
  }, 1200);
};
