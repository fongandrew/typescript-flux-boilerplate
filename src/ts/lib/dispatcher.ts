import flux = require("flux");

// Base class for all types actions to dispatch
export class Action {};

// Singleton instance of dispatcher, tied to a particular payload class
export var dispatcher = new flux.Dispatcher<Action>();

