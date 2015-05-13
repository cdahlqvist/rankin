
var cluster = require('cluster');

module.exports.load_driver = function(driver_name) {
  var driver_path = '../drivers/' + driver_name;
  var driver;

  try {
    driver = require(driver_path);
  }
  catch(e1){
  	console.log('Driver %s could not be loaded from drivers directory: %s', driver_name, e1.message);
    try {
      driver = require(driver_name);
    }
    catch(e2) {
      console.log('Error: Driver %s could not be loaded: %s', driver_name, e2.message);
      process.exit();
    }
  }

  return driver;
}

module.exports.log = function(msg) {
  if (cluster.isMaster) {
    console.log('%s %s', new Date().toISOString(), msg);
  } else {
    process.send({ log: msg });
  }
}

module.exports.get_timestamp_string = function() {
  return new Date().toISOString();
}

module.exports.get_timestamp = function() {
  return new Date().getTime();
}








