
var cluster = require('cluster');
var util = require('./util');

if (cluster.isMaster) {
  var argv = require('./argv');
  var config = require('./config');

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
        benchmark_stats.store_statistic(msg.statistic.job, msg.statistic.operation, msg.statistic.result, 
       	msg.statistic.latency, msg.statistic.sla_breach);
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
    log_stats(stats_array);
    util.log('Terminating benchmark.');

    process.exit();
  }, benchmark_duration);

  if (argv.interval > 0) {
    var stats_interval = argv.interval * 1000;

    setTimeout(function report_statistics() {
      var stats_array = benchmark_stats.get_statistics();

      if(stats_array.length == 0) {
        util.log('STATS No statistics to report.');
      } else {
        log_stats(stats_array);
      }

      setTimeout(report_statistics, stats_interval);
    }, stats_interval);
  }
} else {
    var agent = require('./agent');
}


function log_stats(stats_array) {
  for (var i = 0; i < stats_array.length; i++) {
    var s = stats_array[i];
    var statmsg = 'STATS job=' + s.job + ', operation=' + s.operation + ', result=' + s.result + 
        ', period=' + s.period.toFixed(3) + ', count=' + s.count + ', tps=' + s.tps.toFixed(3) +
        ', sla_breaches=' + s.sla_breaches + ', min=' + s.min + ', max=' + s.max + 
        ', mean=' + s.mean.toFixed(3) + ', std_dev=' + s.std_dev.toFixed(3);
    util.log(statmsg);
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
