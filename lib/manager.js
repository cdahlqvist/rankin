
var cluster = require('cluster');
var util = require('./util');
var queue = require('./queue');
var result_writer = require('./result_writer');

if (cluster.isMaster) {
  var argv = require('./argv');
  var config = require('./config');

  var result_queue = new queue.Queue();
  result_writer.run(config.run_id, config.directory, result_queue);

  var statistics = require('./statistics');
  var benchmark_stats = new statistics.Statistics();

  for (var driver in config.driver_operations) {
      validate_driver(driver, config.driver_operations[driver]);
  }

  var agent_count = (argv.agents > config.task_list.length) ? config.task_list.length : argv.agents; 
  
  var msg = 'Starting ' + agent_count + ' agent(s) for ' + config.task_list.length + ' tasks.';
  util.log(msg);

  var agent_task_lists = {};

  for (var index = 0; index < config.task_list.length; index++) {
    var agent = index % agent_count;

    if (agent_task_lists[agent]) {
      agent_task_lists[agent].push(config.task_list[index]);
    } else {
      agent_task_lists[agent] = [config.task_list[index]];
    }
  }

  var agents = [];

  for (var i = 0; i < agent_count; i++) {
    agents[i] = cluster.fork({ task_list: JSON.stringify(agent_task_lists[i]), hosts: argv.hosts });

    agents[i].on('message', function(msg) {
      if(msg.statistic) {
        benchmark_stats.store_statistic(msg.statistic.job_id, msg.statistic.operation, msg.statistic.result.result_code, 
       	msg.statistic.latency, msg.statistic.sla_breach);

        if(config.runtime) {
          msg.statistic.run = config.runtime;
        }

        result_queue.enqueue(msg.statistic);
      }

      if (msg.log) {
        util.log(msg.log);
      }
    });
  }
    
  util.log('Starting benchmark.');

  var benchmark_duration = 60 * 1000 * argv.duration;

  setTimeout(function terminate_benchmark() {
    for (var i in agents) {
      agents[i].send('{ terminate: true }');
    }

    var stats_array = benchmark_stats.get_statistics();
    
    log_stats(config.runtime, result_queue, stats_array);
    result_queue.enqueue({ terminate: true });
  }, benchmark_duration);

  if (argv.interval > 0) {
    var stats_interval = argv.interval * 1000;

    setTimeout(function report_statistics() {
      var stats_array = benchmark_stats.get_statistics();

      if(stats_array.length > 0) {
        log_stats(config.runtime, result_queue, stats_array);
      }

      setTimeout(report_statistics, stats_interval);
    }, stats_interval);
  }
} else {
    var agent = require('./agent');
}


function log_stats(runtime, queue, stats_array) {
  for (var i = 0; i < stats_array.length; i++) {
    var s = stats_array[i];

    var stat = { run: runtime };
    stat.timestamp = util.get_timestamp_string()
    stat.record_type = "summary";
    stat.job_id = s.job;
    stat.operation = s.operation;
    stat.result = { result_code: s.result };
    stat.period = s.period.toFixed(3);
    stat.count = s.count;
    stat.tps = s.tps.toFixed(3);
    stat.sla_breaches = s.sla_breaches
    stat.latency_min = s.min;
    stat.latency_max = s.max;
    stat.latency_avg = s.mean.toFixed(3);
    stat.latency_stddev = s.std_dev.toFixed(3);

    queue.enqueue(stat);
  }
}

function validate_driver(driver_name, operations) {
  var driver = util.load_driver(driver_name);

  if (driver['init'] && typeof driver['init'] !== 'function') {
    var msg = 'Error: init method incorrectly specified for driver ' + driver_name + '.';
    util.log(msg);
    process.exit();
  }

  for (var i in operations) {
    var op = operations[i];
    if (!driver[op]) {
      console.log('Error: Driver %s does not expose operation %s.', driver_name, op);
      process.exit();
    } else if (typeof driver[op] !== 'function') {
      console.log('Error: Operation %s incorrectly specified for driver %s.', op, driver_name);
      process.exit();
    }
  }
}
