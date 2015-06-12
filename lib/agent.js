
var async = require('async');
var worker = require('./worker');
var cluster = require('cluster');

// Register event listener for shutdown messages
process.on('message', function(msg) {
  if (msg.terminate) {
    process.exit();
  }
});

var task_list = JSON.parse(process.env.task_list);
var hosts = process.env.hosts.split(',');

// Launch worker for each job i parallel
process.send({ log: 'Agent starting.' });

var callbackArray = [];

task_list.forEach(function(task) {
  callbackArray.push(makeCallbackFunc(hosts, task))
});

async.parallel(callbackArray);


function makeCallbackFunc(hosts, task) {
  return function (callback) {
    worker.run(hosts, task, callback);
  };
}




