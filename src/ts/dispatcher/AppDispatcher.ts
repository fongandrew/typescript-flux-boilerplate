// A singleton that operates as the central hub for application updates.
import dispatcher = require("flux");
module.exports = new dispatcher.Dispatcher();
