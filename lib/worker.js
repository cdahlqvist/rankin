
var elasticsearch = require('elasticsearch');
var util = require('./util');

module.exports.run = function(hosts, task) {
  var driver = util.load_driver(task.driver);
  var operations = create_operations(driver, task.operations);
  var opindex;

  if(task.cycle_operations) {
    opindex = 0;
  } else {
    opindex = false;
  }

  try {
    var esClient = new elasticsearch.Client({
      hosts: hosts,
      min_sockets: 1,
      requestTimeout: 30000
    });

    esClient.ping({
      requestTimeout: 30000,
    }, function (error) {
      if (error) {
        util.log('Error connecting to Elasticsearch. Terminating.');
        process.exit();
      } 
    });
  }
  catch(e){
    var error_message = 'Worker failed to start Elasticsearch Client: ' + e.message + ' Terminating.';
    util.log(error_message);
    process.exit();
  }

  var state;
  if(typeof driver.init === 'function') {
    state = driver.init(esClient, task.parameters);
  } else {
    state = {};
  }

  var interval = task.op_dur_ms;

  var initial_delay = 0;
  if (interval > 0) {
    initial_delay = task.initial_delay_ms;
  }

  setTimeout(function benchmark(driver, esClient, state, task, operations, opindex, interval) {
    var start_ts = util.get_timestamp();
    var op;
    if(util.is_integer(opindex)) {
      var idx = opindex % operations.length;
      op = operations[idx];
      opindex++;
    } else {
      op = select_random_operation(operations);
    }

    driver[op.name](esClient, state, op.parameters, function result_callback(result) {
      if(util.is_string(result)) {
        result = { 'result_code': result };
      } else if (util.is_object(result)) {
        if(!result['result_code']) {
          result['result_code'] = 'RESULT_CODE_MISSING';
        }
      } else {
        console.log('Error: Illegal return type from job %s and operation %s.', job.job_id, op.name);
        process.exit();
      }

      var latency = util.get_timestamp() - start_ts;

      var sla_breach = false;
      if(op.sla > 0 && op.sla < latency) {
        sla_breach = true;
      }

      process.send( { statistic: { timestamp: util.get_timestamp_string(), job_id: task.job_id, driver: task.driver, record_type: "detail", operation: op.name, result: result, latency: latency, sla_breach: sla_breach} } );

      var delay = Math.max(0, (interval - (util.get_timestamp() - start_ts)));

      setTimeout(benchmark, delay, driver, esClient, state, task, operations, opindex, interval);
    });
  }, initial_delay, driver, esClient, state, task, operations, opindex, interval);
}


function create_operations(driver, operations) {
  var total_weight = 0;
    
  if (operations === undefined || operations === []) {
    return get_driver_operations(driver);
  }
    
  operations.forEach(function (op) {
    if (op.weight) {
      total_weight += op.weight;
    } else {
      op.weight = 1.0;
      total.weight += 1.0;
    }
  });

  operations.forEach(function (op) {
    op.weight = op.weight / total_weight;
  });

  return operations;
}

function get_driver_operations(driver) {
  var operations = [];
  var opnames = [];

  for (opname in driver) {
    if(typeof driver[opname] === 'function' && opname !== 'init') {
        opnames.push(opname);
    }
  }

  var weight = 1.0 / opnames.length;

  opnames.forEach(function(entry){
    operations.push({ name: entry, weight: weight, sla: 0});
  });

  return operations;
}

function select_random_operation(operations) {
  var rnd = Math.random();
  var agg = 0.0;
  var index = 0;
  var selected_operation;

  while (agg < rnd) {  
    selected_operation = operations[index];
    agg +=  operations[index]['weight'];
    index++;
  }

  return selected_operation;
}
