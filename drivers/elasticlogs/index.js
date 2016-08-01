
var fs = require('fs');
var util = require('../../lib/util');
var moment = require('moment');
var randomevent = require('./lib/randomevent');
var Promise = require('bluebird');

module.exports.init = function(esClient, parameters, driver_data) {
  var state = {};
  var i;

  set_state_value('batch_size', state, parameters, 1000);
  
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

  if (parameters && parameters.delete_fields) {
    if(!util.is_string_array(parameters.delete_fields)) {
      util.log('makelogs error: Invalid delete_fields array specified. Assuming no fields are to be deleted.');
      state.delete_fields = [];
    } else {
      state.delete_fields = parameters.delete_fields;
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
        } else {
          result_callback( { result_code: 'OK', operations_count: state.batch_size, operations_ok: state.batch_size, operations_fail: 0 } );
        }
      }
    });
  });
}

function generate_batch(state, driver_data, data_array, result_callback) {
  var events_to_generate = Math.min(20, (state.batch_size - data_array.length));

  for (var i = 0; i < events_to_generate; i++) {
    var event = randomevent.RandomEvent(state, driver_data);
    state.delete_fields.forEach(function remove_field(fieldname) {
    	delete event[fieldname];
    });

    var idx = event.index;
    delete event['index'];

    data_array.push({
      header: { create: { _index: idx, _type: 'logs' } },
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

function count_response_errors(resp) {
  var error_count = 0;
  var results = resp.items;
  for(var i = 0; i < results.length; i++) {
    if(results[i]['create'] && results[i]['create']['status'] && results[i]['create']['status'] >= 300) {
      error_count++;
    }
  }

  return error_count;
}
