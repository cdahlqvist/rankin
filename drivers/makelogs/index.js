
var fs = require('fs');
var util = require('../../lib/util');
var moment = require('moment');
var randomevent = require('./randomevent');
var Promise = require('bluebird');

module.exports.init = function(esClient, parameters, driver_data) {
  var state = {};
  var i;

  set_state_value('batch_size', state, parameters, 1000);
  set_state_value('int_fields', state, parameters, 0);
  set_state_value('str_fields', state, parameters, 0);
  set_state_value('str_files', state, parameters, []);
  set_state_value('text_files', state, parameters, []);
  set_state_value('text_output_file', state, parameters, undefined);
  set_state_value('json_output_file', state, parameters, undefined);
  
  if (parameters && parameters['days']) {
    state.days = parse_days(parameters['days']);
  }

  if (parameters && parameters['index_prefix']) {
    state.index_prefix = parameters['index_prefix'];
  } else {
    state.index_prefix = 'rankin-';
  }

  if (parameters && parameters['time_index'] == false) {
    state.time_index = false;
  } else {
  	state.time_index = true;
  }

  if (state.int_fields) {
    if (!parameters.int_limits || !util.is_number_array(parameters.int_limits)) {
      util.log('makelogs error: Incorrect parameter int_limit specified. Assuming max integer is 10000000.');
      state.int_limits = [10000000];
    } else {
    	state.int_limits = parameters.int_limits;
    }
  }

  if (parameters && parameters.delete_fields) {
    if(!util.is_string_array(parameters.delete_fields)) {
    	util.log('makelogs error: Invalid delete_fields array specified. Assuming no fields are to be deleted.');
        state.delete_fields = [];
    } else {
    	state.delete_fields = parameters.delete_fields;
    }
  }

  if (state.str_fields && state.str_fields > 0) {
    if (!state.str_files || !util.is_string_array(state.str_files) || state.str_files.length < 1) {
      util.log('makelogs error: Incorrect parameter str_files specified.');
      process.exit();
    } else {
      for(i = 0; i < state.str_files.length; i++) {
        if(!driver_data[state.str_files[i]]) {
          var lines = load_string_file(state.str_files[i]);
          if(lines == undefined) {
            process.exit();
          }

          driver_data[state.str_files[i]] = lines;
        }
      }
    }
  }
  
  if (parameters.text_files && (!util.is_string_array(parameters.text_files) || parameters.text_files.length < 1)) {
    util.log('makelogs error: Incorrect parameter text_files specified.');
    process.exit();
  } else {
    for(i = 0; i < state.text_files.length; i++) {
      if(!driver_data[state.text_files[i]]) {
        var lines = load_string_file(state.text_files[i]);
        if(lines == undefined) {
          process.exit();
        }

        driver_data[state.text_files[i]] = lines;
      }
    }
  }

  return state;
}

module.exports.index = function(esClient, state, driver_data, operation_parameters, result_callback) {
  generate_batch(state, driver_data, [], function (result_array) {
    var bulk_body = [];
    result_array.forEach(function (event) {
    	bulk_body.push(event.header);
    	bulk_body.push(event.body);
    });

    esClient.bulk({
      body: bulk_body
    }, function (err, resp) {
      if (err) {
        result_callback( { result_code: 'REQUEST_ERROR', operations_count: state.batch_size, operations_ok: 0, operations_fail: state.batch_size } );
      } else {
        if(resp && resp.errors) {
          var resp_errors = count_response_errors(resp);
          var successful = state.batch_size - resp_errors;
          result_callback( { result_code: 'EVENT_ERROR', operations_count: state.batch_size, operations_ok: successful, operations_fail: resp_errors } );
        }

        result_callback( { result_code: 'OK', operations_count: state.batch_size, operations_ok: state.batch_size, operations_fail: 0 } );
      }
    });
  });
}

module.exports.generate = function(esClient, state, driver_data, operation_parameters, result_callback) {
  generate_batch(state, driver_data, [], function (result_array) {
    if(state['json_output_file'] || state['text_output_file']) {
      var json_events = [];
      var text_events = [];
      result_array.forEach(function (event) {
        if (state['json_output_file']) {
      	  json_events.push(JSON.stringify(event.body));
        }

        if(state['text_output_file'] && event.body['@message']) {
          text_events.push(event.body['@message']);
        }
      });

      var json_data = json_events.join("\n") + "\n";
      var text_data = text_events.join("\n") + "\n";

      if (state['json_output_file'] && state['text_output_file'] && text_events.length > 0) {
        fs.appendFile(state['json_output_file'], json_data, function () {
          fs.appendFile(state['text_output_file'], text_data, function () {
            result_callback( { result_code: 'OK', batch_size: state.batch_size } );
          })
        })
      } else if (state['json_output_file']) {
        fs.appendFile(state['json_output_file'], json_data, function () {
          result_callback( { result_code: 'OK', batch_size: state.batch_size } );
        })
      } else if (state['text_output_file'] && text_events.length > 0) {
        fs.appendFile(state['text_output_file'], text_data, function () {
          result_callback( { result_code: 'OK', batch_size: state.batch_size } );
        })
      }
    } else {
      result_callback( { result_code: 'OK', batch_size: state.batch_size } );
    }
  });
}


function generate_batch(state, driver_data, data_array, result_callback) {
  var events_to_generate = Math.min(20, (state.batch_size - data_array.length));

  for (var i = 0; i < events_to_generate; i++) {
    var event = randomevent.RandomEvent(state, driver_data);
    state.delete_fields.forEach(function remove_field(fieldname) {
    	delete event[fieldname];
    });

    data_array.push({
      header: { create: { _index: event.index, _type: 'logs' } },
      body: event
    });
  }

  if(state.batch_size <= data_array.length) {
    result_callback(data_array);
  } else {
  	//setTimeout(generate_batch, 0, state, data_array, result_callback);
    process.nextTick( function () {
    	generate_batch(state, driver_data, data_array, result_callback);
    });
  }
}

function parse_days(str) {
  var interval, start, end;
  var absolute_day = /^(\d{4}-\d{2}-\d{2})$/;
  var absolute_day_interval = /^(\d{4}-\d{2}-\d{2}),(\d{4}-\d{2}-\d{2})$/;
  var relative_day_interval = /^([+-]?\d+),([+-]?\d+)$/;
 
  var match = absolute_day.exec(str);

  if (match) {
    start = moment(match[1]).utc().startOf('day').valueOf();
    end = moment(match[1]).utc().endOf('day').valueOf();

    interval = { start: start, end: end};
  } 

  match = absolute_day_interval.exec(str);

  if (match) {
    start = moment(match[1]).utc().startOf('day').valueOf();
    end = moment(match[2]).utc().endOf('day').valueOf();

    interval = { start: start, end: end};
  }

  match = relative_day_interval.exec(str);

  if (match) {
    start = moment().utc().startOf('day').add('days', parseInt(match[1])).valueOf();
    end = moment().utc().endOf('day').add('days', parseInt(match[2])).valueOf();

    interval = { start: start, end: end};
  }

  return interval;
}

function set_state_value(name, state, parameters, default_value) {
  if (parameters && parameters[name]) {
    state[name] = parameters[name];
  } else {
    state[name] = default_value;
  }
}

function load_string_file(str_file) {
  try {
    var file_data = fs.readFileSync(str_file, {encoding: 'utf-8'});
    var string_array = file_data.split(/\r?\n/);
    return string_array;
  }
  catch (e) {
  	var logmsg = 'makelogs error: unable to load file ' + str_file + ': ' + e.message;
    util.log(logmsg);
    return undefined;
  }
}

function load_string_files(str_files) {
  var files = [];
  str_files.forEach(function (filename) {
    var lines = load_string_file(filename);
    if (lines) {
      files.push(lines);
    } else {
    	return undefined;
    }
  });

  return files;
}

function count_response_errors(resp) {
  var error_count = 0;
  var results = resp.items;
  for(var i = 0; i < results.length; i++) {
    if(results[1]['create']['status'] != 200) {
      error_count++;
    }
  }

  return error_count;
}

