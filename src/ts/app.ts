/// <reference path="./env.d.ts" />
/// <reference path="../typings/tsd.d.ts" />
import shapes = require("./shapes");
declare var t: shapes.Triangle,
            t2: shapes.Triangle,
            s: shapes.Rectangle;
t = new shapes.Triangle();
t2 = new shapes.Triangle();
s = new shapes.Square(10);

console.log("Running in " + process.env.NODE_ENV + " mode");

declare var gogogo: () => void;
gogogo = function(): void {
  $("body").text("Go go gadget!!");
};
