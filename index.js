"use strict";

//Initialize commander.
var commander = require("./commander.js")(),
  errorHandler = require("./error-handler.js");

// 1. Locate drones.
commander.locateDrones()
// 2. Explore labyrinth and read writings.
.then(
    commander.exploreLabyrinth,
    errorHandler
// 3. Send report.
).then(
    commander.sendReport, 
    errorHandler
).catch(
    errorHandler
);

