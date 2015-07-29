// Library for representing a rabbit
import storeLib = require("../lib/store");
import dispatcher = require("../lib/dispatcher");

let AppDispatcher = dispatcher.dispatcher;

// Allowed colors for rabbits
export enum Color {BLACK, BROWN, GRAY};

// Mapping from color to display image
let imgMap: any = {};
imgMap[Color.BLACK] = requireAsset("img/tb.jpg");
imgMap[Color.BROWN] = requireAsset("img/br.jpg");
imgMap[Color.GRAY]  = requireAsset("img/nl.png");

// Representation of Rabbit data in object form -- e.g. representation of
// JSON-ified as it goes back and forth between the server
interface RabbitData {
  _id: string;
  color: string;
  createdOn: Date;
}

// Actual representation of a single rabbit
export class Rabbit implements storeLib.StoreObject {
  _id: string;
  color: Color;
  createdOn: Date;
  dataStatus: storeLib.DataStatus;

  constructor(data: RabbitData);
  constructor(color: Color, status?: storeLib.DataStatus);
  constructor(val: any, status?: any) {
    if (_.isObject(val)) { // Data
      _.extend(this, val);
    } else {               // Just color
      this.color = val;
    }
    this.createdOn = new Date();
    if (status) {
      this.dataStatus = status;
    }
    if (typeof this.dataStatus === "undefined") {
      this.dataStatus = storeLib.DataStatus.READY;
    }
  }

  image(): string {
    return imgMap[this.color];
  }

  // Export as object (e.g. for JSON-ification)
  data(): RabbitData {
    // Convert color back to string name
    let color: any = Color[this.color];
    return {
      _id: this._id,
      color: color,
      createdOn: this.createdOn
    };
  }
}

// Create singleton instance of store for Rabbits-- export only single 
// instance, not the underlying class itself!
class RabbitStore extends storeLib.Store<Rabbit> {}
export var store = new RabbitStore();

// Export store-related actions and connect them to store
export class Insert extends storeLib.InsertAction<Rabbit> {}
store.handle(Insert);
export class Update extends storeLib.UpdateAction<Rabbit> {}
store.handle(Update);
export class Remove extends storeLib.RemoveAction {}
store.handle(Remove);

// Connect default RabbitStore actions to dispatcher
store.register(AppDispatcher);
