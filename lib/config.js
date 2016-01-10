
var path = require('path')
var argv = require('./argv');
var util = require('./util');

var config = argv;

var driver_operations = {};
config.task_list = [];
config.runtime = { run_id: argv.run_id };

for (var index = 0; index < argv.file.length; ++index) {
  var fname = argv.file[index];
  var config_object = load_file(fname);
  
  extract_runtime(config_object, config.runtime, fname);

  if(config_object.jobs) {
    if(!util.is_array(config_object.jobs)) {
      console.log("Error loading configuration file %s. The 'job' field does not contain an array of jobs.", fname);
      process.exit();
    }

    var job_count = config_object.jobs.length;
    for (var i = 0; i < job_count; i++) {
      var job = config_object.jobs[i];
      validate_job(job, fname);
      update_driver_operations(job, driver_operations);
      config.task_list.push.apply(config.task_list, create_tasks_from_job(job));
    }
  }
}

config.driver_operations = driver_operations;

module.exports = config;


function load_file(filename) {
  var fs = require('fs');
  console.log('Load configuration file %s', filename);

  try {
    return JSON.parse(fs.readFileSync(filename, 'utf8'));
  }
  catch(e){
    console.log('Error loading the configuration file %s: %s', filename, e.message);
    process.exit();
  }
}

function extract_runtime(config_object, runtime, filename) {
  if(config_object.run && !util.is_object(config_object.run)) {
    console.log("Error loading configuration file %s. The 'run' is not an object.", fname);
    process.exit();
  }

  if(config_object.run) {
    for (var key in config_object.run) {
      runtime[key] = config_object.run[key];
    }
  }
}

function validate_job(job, filename) {
  if (!job.job_id) {
    console.log('Error: No job_id specified for the job defined in %s', filename);
    process.exit();
  }

  if (!job.driver) {
    console.log('Error: No driver specified for the job defined in %s', filename);
    process.exit();
  }

  if (job.concurrency === undefined) {
    job.concurrency = 1;
  } else if (typeof job.concurrency !== 'number' || job.concurrency < 1) {
    console.log('Error: Illegal concurrency rate (%s) specified for job %s', job.concurrency, job.job_id);
    process.exit();
  }

  if(job.rate_limit && (typeof job.rate_limit !== 'number' || job.rate_limit <= 0)) {
    console.log('Error: Illegal rate limit (%s) specified for job %s', job.rate_limit, job.job_id);
    process.exit();
  }

  if (job.operations) {
    for (var i in job.operations) {
      var op_spec = job.operations[i];
    		
      if(typeof op_spec['name'] !== 'string' || op_spec['name'] =='init') {
        console.log('Error: Illegal name specified in %s for operation %s.', job.job_id, JSON.stringify(op_spec));
        process.exit();
      }

      if(op_spec['weight'] && (typeof op_spec['weight'] !== 'number' || op_spec['weight'] <= 0)) {
        console.log('Error: Illegal weight specified in %s for operation %s.', job.job_id, JSON.stringify(op_spec));
        process.exit();
      }

      if(op_spec['sla'] && (typeof op_spec['sla'] !== 'number' || op_spec['sla'] <= 0)) {
        console.log('Error: Illegal sla specified in %s for operation %s.', job.job_id, JSON.stringify(op_spec));
        process.exit();
      }
    }
  }

  return true;
}

function update_driver_operations(job, driver_operations) {
  if (job.operations) {
    var driver = job.driver;
    var operations;

    if(driver_operations[driver]) {
      operations = driver_operations[driver];
    } else {
      operations = [];
    }

    for (var i in job.operations) {
      var op = job.operations[i];
      if (operations.indexOf(op) <= -1) {
        operations.push(op['name']);
      }
    }

    driver_operations[driver] = operations;
  }
}

function create_tasks_from_job(job) {
  var initial_interval_ms = 0;

  if(job.rate_limit) {
    job.op_dur_ms = job.concurrency * 1000 / job.rate_limit;
    initial_interval_ms = job.op_dur_ms / job.concurrency;
    job.initial_delay_ms = 0;
  } else {
    job.op_dur_ms = 0;
  }

  var task_list = [job];

  for (var i = 1; i < job.concurrency; i++) {
    var job_clone = clone(job);
    job_clone.initial_delay_ms = initial_interval_ms * i;
    task_list.push(job_clone);
  }

  return task_list;
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}
