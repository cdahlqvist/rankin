
var async = require('async');
var worker = require('./worker');
var cluster = require('cluster');
var util = require('./util');

// Register event listener for shutdown messages
process.on('message', function(msg) {
  util.log("Terminating agent.");
  process.exit();
});

var task_list = JSON.parse(process.env.task_list);
var hosts = process.env.hosts.split(',');
var benchmark_duration = 60 * 1000 * (process.env.duration + 1);

setTimeout(function terminate_benchmark() {
    process.exit();
}, benchmark_duration);

// Launch worker for each job i parallel
process.send({ log: 'Agent starting.' });

var callbackArray = [];
var driver_data = {};

task_list.forEach(function(task) {
  if(!driver_data[task.driver]) {
  	driver_data[task.driver] = {};
  }

  callbackArray.push(makeCallbackFunc(hosts, task, driver_data[task.driver]))
});

async.parallel(callbackArray);


function makeCallbackFunc(hosts, task, driver_data) {
  return function (callback) { 	
    worker.run(hosts, task, driver_data, callback);
  };
}
