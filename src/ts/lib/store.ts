import _ = require("lodash");
import events = require("events");
import crypto = require("crypto");
import flux = require("flux");
import dispatcher = require("./dispatcher");

////////////////

export enum DataStatus { READY, INFLIGHT };

// Wrapper around items that get stored in Store
export interface StoreObject {
  _id: string;
  dataStatus: DataStatus;
}


///////////////

// Basic / common store related actions to be implemented alongside
// an instance of the store

// Action for inserting a new object into the store
export class InsertAction<TObject extends StoreObject> extends dispatcher.Action {
  object: TObject;

  constructor(object: TObject) {
    super();
    this.object = object;
  }
}

// Action for updating an object by _id
export class UpdateAction<TObject extends StoreObject> extends dispatcher.Action {
  _id: string;
  update: any; // Type-checked in constructor below

  // Can update either with a function that processes the old object and
  // returns a replacement, or returns a brand new replacement object
  constructor(_id: string, updateFn: (old: TObject) => TObject);
  constructor(_id: string, replacement: TObject);
  constructor(_id: string, update: any) {
    super();
    this._id = _id;
    this.update = update;
  }
}

// Action for removing an object with a given key from store
// NB: Generic class not required here since we just need the _id
export class RemoveAction extends dispatcher.Action {
  _id: string;

  constructor(_id: string) {
    super();
    this._id = _id;
  }
}


////////////

interface IHandler {
  actionType: { new (...args: any[]): dispatcher.Action };
  handler: (action: dispatcher.Action) => void;
}

// Base class for stores
export class Store<TObject extends StoreObject> extends events.EventEmitter {

  // For simplicity we just emit a single change variable whenever any 
  // modification happens to a store and let the handler re-query as 
  // appropriate to figure out what's different. This is a little inefficient, 
  // but it's insignificant relative to round-trip time to a server or updating 
  // the actual DOM, and it makes reasoning about our code a lot easier.
  private CHANGE_EVENT: string = "CHANGE";

  // Actual container for data
  private data: {
    [index: string]: TObject
  };

  // Action handlers that get called
  private handlers: IHandler[];


  ///////////

  constructor() {
    super();
    this.reset();
    this.handlers = [];
  }

  // Clears all data in store
  reset(): void {
    this.data = {};
  }

  // Returns an instance stored with a particular _id
  get(_id: string): TObject|void {
    if (this.exists(_id)) {
      return this.data[_id];
    }
  }

  // Return all store objects
  getAll(): TObject[] {
    return _.values(this.data);
  }
  
  // Register a callback to handle store changes
  addChangeListener(callback: () => void): void {
    this.on(this.CHANGE_EVENT, callback);
  }

  // De-register a callback to handle store changes
  removeChangeListener(callback: () => void): void {
    this.removeListener(this.CHANGE_EVENT, callback);
  }

  // Register an action subclass
  handle(actionType: { new (...args: any[]): InsertAction<TObject> }): void;
  handle(actionType: { new (...args: any[]): UpdateAction<TObject> }): void;
  handle(actionType: { new (...args: any[]): RemoveAction }): void;
  handle(actionType: { new (...args: any[]): dispatcher.Action }, 
         handler: (action: dispatcher.Action) => void): void;
  handle(actionType: any, handler?: any): void {
    if (! handler) {
      let proto = actionType.prototype;
      if (proto instanceof InsertAction) {
        handler = this.insert;
      }
      else if (proto instanceof UpdateAction) {
        handler = this.update;
      }
      else if (proto instanceof RemoveAction) {
        handler = this.remove;
      }
      // Else we should never get here if TypeScript does its job
    }

    // Add handler to a list
    this.handlers.push({
      actionType: actionType,
      handler: handler
    });
  }

  // Call to have the store instance self-register with a dispatcher
  // Registered handler will compare a dispatch action to each of the store's
  // registered handlers to see if there's a type match.
  register(dispatcher: flux.Dispatcher<dispatcher.Action>): void {
    let self = this;
    dispatcher.register(function(action: dispatcher.Action) {
      _.each(self.handlers, function(handlerObj: IHandler) {
        if (action instanceof handlerObj.actionType) {
          handlerObj.handler.call(self, action);
        }
      });
    });
  }


  ////////////

  // CRUD-related helper functions - These should be protected, not private
  // because we may to want to modify how they function in derived classes

  // Call this whenever the store is changed
  protected emitChange(): void {
    this.emit(this.CHANGE_EVENT);
  }

  // Returns true if an item exists
  protected exists(_id: string): boolean {
    return this.data.hasOwnProperty(_id);
  }

  // Creates a random identifier for a new object
  protected makeId(): string {
    // 16 bytes is standard UUID strength
    return crypto.randomBytes(16).toString("hex");
  }

  // Set a given 
  protected set(_id: string, obj: TObject): void {
    // Forgot set _id by accident, no biggie, just set now
    if (! obj._id) {
      obj._id = _id;
    }

    // Definitely not intended behavior
    else if (obj._id !== _id) {
      throw new Error("Object _id does not match passed _id");
    }

    this.data[_id] = obj;
  }

  // Handle InsertAction
  protected insert(action: InsertAction<TObject>): void {
    let obj = action.object;
    if (! obj._id) {
      obj._id = this.makeId();
    }
    if (this.exists(obj._id)) {
      throw new Error("Property already exists for store key");
    }
    this.set(obj._id, obj);
    this.emitChange();
  }

  // Handle UpdateAction
  protected update(action: UpdateAction<TObject>): void {
    let _id = action._id;
    let update = action.update;

    if (this.exists(_id)) {
      if (_.isFunction(update)) {
        update = update(this.get(_id));
      }
      this.set(_id, update);
      this.emitChange();
    }
  }

  // Handle RemoveAction
  protected remove(action: RemoveAction): boolean {
    let _id = action._id;
    if (this.exists(_id)) {
      delete this.data[_id];
      this.emitChange();
    }
    return false;
  }
};
