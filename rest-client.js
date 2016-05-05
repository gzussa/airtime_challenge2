"use strict";

var http = require('http'),
	config = require('./config.js');

exports.get = _get;

/**
 * Perform a GET rest call
 **/
function _get(path) {

  return new Promise(function(resolve, reject) {
    // prepare the header
    var requestHeaders = {
        'Content-Type' : 'application/json',
        'x-commander-email': config.email
    };

    // the post options
    var requestOptions = {
        host : config.host,
        port : config.port,
        path : path,
        method : 'GET',
        headers : requestHeaders
    };

    // Perform the GET call
    var req = http.request(requestOptions, function(res) {
      var output = '';
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            output += chunk;
        });

        res.on('end', function() {
            var obj = JSON.parse(output);
            resolve(obj);
        });
    });
    req.end();
    req.on('error', function(e) {
        reject(Error(e));
    });
  });
} 

exports.post = _post;

/**
 * Perform a POST rest call
 **/
function _post(path, data) {

  return new Promise(function(resolve, reject) {
    // prepare the header
    var requestHeaders = {
        'Content-Type' : 'application/json',
        'Content-Length' : Buffer.byteLength(JSON.stringify(data), 'utf8'),
        'x-commander-email': config.email
    };

    // the post options
    var requestOptions = {
        host : config.host,
        port : config.port,
        path : path,
        method : 'POST',
        headers : requestHeaders
    };

    // Perform the POST call
    var req = http.request(requestOptions, function(res) {
        res.setEncoding('utf8');
        res.on('data', function(chunk) {
            resolve(chunk);
        });
    });
    // write the json data
    req.write(JSON.stringify(data));
    req.end();
    req.on('error', function(e) {
        reject(Error(e));
    });
  });
} 