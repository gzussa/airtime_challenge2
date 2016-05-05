"use strict";

/**
 * Commander module must be instanciated since it contains stateful variables.
 **/
function _commander(){
    var restclient = require("./rest-client.js"),
        errorHandler = require("./error-handler.js"),
        Promise = require("bluebird");

    // Queue used to exploring labyrinth using breadth first search algorithm.
    var queueExplore = [];
    var queueRead = [];

    // Map to track which rooms have been explored already.
    var exploredRooms = {};

    var drones = [];
    // Use table to store writings in order to get them ordered for free.
    var writings = [];

    var _locateDrones = function(){
      	console.log("Locate drones.");
      	return restclient.get('/start');
    }

    var _exploreLabyrinth = function(data){
      	if(data == null || data.roomId == null){
      		throw new exception("You must call locateDrones before to explore labyrinth.");
      	}

      	console.log("Explore labyrinth.");

      	// Save received data from locate drone
      	exploredRooms[data.roomId] = true;
      	drones = data.drones;
      	queueExplore.push(data.roomId);

      	// Explore and read labyrinth until they are rooms unexplored or unread.
      	return promiseWhile(
        		// Condition to stop while loop
        		function() {
        	  		return queueExplore.length != 0 || queueRead.length != 0; 
        		}, 
        		// Action to execute until above condition returns false
        		function() {      
        	  		return commandDrones(); 
        		}
      	);
    };

    /**
     *  Send commands to all drones.
     **/
    function commandDrones(){
      	var dronesTasks = [];
      	// for each drone, generate commands instructions
      	for(var i = 0; i < drones.length; i++){
      		  dronesTasks[i] = commandDrone(drones[i], generateDroneCommands(i));
      	}
      
      	return new Promise.all(dronesTasks);
    }

    /**
     * Return drone commands to execute based on rooms left to explore and read.
     * Return 5 commands max.
     * Explore commands are generated first in order to explore labyrinth as fas as possible.
     **/
    function generateDroneCommands(drone){
      	var commands = {};
      	var droneId = drones[drone];
      	var roomIdsToExplore = fetchMaxRoomIdToExplore();
      	for(var i = 0; i < roomIdsToExplore.length; i++){
        	  commands[droneId+"_explore_"+roomIdsToExplore[i]] = {
                "explore": roomIdsToExplore[i]
          	};
      	}
      	var roomIdsToRead = fetchMaxRoomIdToRead(5 - roomIdsToExplore.length);
      	for(var i = 0; i < roomIdsToRead.length; i++){
            commands[droneId+"_read_"+roomIdsToRead[i]] = {
                "read": roomIdsToRead[i]
          	};
      	}
      	return commands;
    }

    function fetchMaxRoomIdToExplore(){
      	var result = [];
      	for(var i = 0; i < 5; i++){
      	    //When we explore a room we add it to the queueRead in order to be read later on.
      	    if(queueExplore.length > 0){
      		      var roomId = queueExplore.pop();
      		      result[result.length] = roomId;
      		      queueRead.push(roomId);
      	    }
      	}
      	return result;
    }

    function fetchMaxRoomIdToRead(max){
      var result = [];
      for(var i = 0; i < max; i++){
          if(queueRead.length > 0){
              result[result.length] = queueRead.pop();
          }
      }
      return result;
    }

    /**
     *  Analyse drone response after exploring labyrinth.
     **/
    function commandDrone(droneId, commands) {
        return sendDroneCommands(droneId, commands).then(  
          function(response){
              var commandNames = Object.keys(commands);
              for(var i = 0; i < commandNames.length; i++){
                  var commandName = commandNames[i];
                  if(commandName.includes("_explore_")){
                      if(response[commandName] != null && response[commandName].connections != null){
                          var connections = response[commandName].connections;
                          for(var j = 0; j < connections.length; j++){
                              //We don't add room to queue if it has already been explored
                              if(exploredRooms[connections[j]] == null){
                                  queueExplore.push(connections[j]);
                                  //Mark room as explored
                                  exploredRooms[connections[j]] = true;
                              }
                          }
                      }else{
                          errorHandler(JSON.stringify(response[commandName]));
                      }
                  }else if(commandName.includes("_read_")){
                      if(response[commandName] != null && response[commandName].order != null){
                          var order = response[commandName].order;
                          var writing = response[commandName].writing;
                          if(order != -1){
                              console.log('order : '+order+' | writing : '+writing);
                              writings[order] = writing;
                          }
                      }else{
                          errorHandler(JSON.stringify(response[commandName]));
                      }
                  }
              }
          
          }, errorHandler

      );
    }

    /**
     *  Send commands to specific drone.
     **/
    function sendDroneCommands(droneId, commands) {
      	return new Promise(function(resolve, reject) {
        	  restclient.post("/drone/"+droneId+"/commands", commands).then(
    	      	  function(data){
    	        	    resolve(JSON.parse(data));
    	      	  }, function(error) {
    	        	    reject(Error(error));
    	      	  }
        	  );
      	});
    }

    var _sendReport = function(data){
        
        if(writings.length == 0){
          throw new exception("You must call exploreLabyrinth before to send a report.");
        }
        
        console.log("Send report.");
        var report = "";
        for(var i = 0; i < writings.length; i++){
          if(writings[i] != null){
              report += writings[i];
          }
        }
        var reportData = {message: report};

        restclient.post('/report', reportData).then(
            function(response){
                console.log(response);
            }, errorHandler
        );
    }

    /**
     * Helper method to perform while loop on async jobs in a sync fashion using Premise
     **/
    var promiseWhile = Promise.method(function(condition, action) {
        if (!condition()) return;
        return action().then(promiseWhile.bind(null, condition, action));
    });

    /**
     *  Simple custom exception.
     **/
    function exception(message) {
        this.message = message;
    }

    return {
        locateDrones : _locateDrones,
        exploreLabyrinth : _exploreLabyrinth,
        sendReport : _sendReport
    }
}

module.exports = _commander;

