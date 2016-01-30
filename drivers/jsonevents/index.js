
var _ = require('lodash');
var fs = require('fs');
var util = require('../../lib/util');
var moment = require('moment');
var Promise = require('bluebird');

module.exports.init = function(esClient, parameters, driver_data) {
  var state = {};
  var i;

  set_state_value('batch_size', state, parameters, 1000);
  set_state_value('event_template_file', state, parameters, undefined);
  set_state_value('value_definitions', state, parameters, []);
  set_state_value('field_value_map', state, parameters, {});
  set_state_value('timeout', state, parameters, 30000);

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
  
  try {
    if(state['event_template_file'] == undefined) {
      driver_data['template'] = {};
    } else {
      driver_data['template'] = JSON.parse(fs.readFileSync(state['event_template_file'], 'utf8'));
    }
  }
  catch(e){
    var logmsg = 'jsonevents error: unable to load JSON template file ' + state['event_template_file'] + ': ' + e.message + '. Terminating.';
    util.log(logmsg);
    process.exit();
  }

  parse_and_validate_value_definitions(state, driver_data);

  return state;
}

module.exports.index = function(esClient, state, driver_data, operation_parameters, result_callback) {
  var timeout = state.timeout;
  if(operation_parameters.timeout && util.is_integer(operation_parameters.timeout) && operation_parameters.timeout > 0) {
    timeout = operation_parameters.timeout;
  }

  var field_value_map = state.field_value_map;
  if(operation_parameters.field_value_map) {
    field_value_map = operation_parameters.field_value_map;
  }

  generate_batch(state, driver_data, field_value_map, [], function (result_array) {
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


function generate_batch(state, driver_data, field_value_map, data_array, result_callback) {
  var events_to_generate = Math.min(20, (state.batch_size - data_array.length));

  for (var i = 0; i < events_to_generate; i++) {
    var evt = generate_json_event(state, driver_data, field_value_map);
    
    data_array.push({
      header: { create: { _index: evt.index, _type: 'logs' } },
      body: evt.body
    });
  }

  if(state.batch_size <= data_array.length) {
    result_callback(data_array);
  } else {
  	//setTimeout(generate_batch, 0, state, data_array, result_callback);
    process.nextTick( function () {
    	generate_batch(state, driver_data, field_value_map, data_array, result_callback);
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

function generate_timestamp(state) {
  var dayMs = 86400000;
  var period = 20000000;
  var dateAsIso;

  if(!state.days) {
    dateAsIso = new Date().toISOString();
  } else {
    var ts = _.random(state.days.start, state.days.end);
    var offset = ts % period;
    var delta = _.random(0, offset);

    dateAsIso = new Date(ts - delta).toISOString();
  }

  return dateAsIso;
}

function set_state_value(name, state, parameters, default_value) {
  if (parameters && parameters[name]) {
    state[name] = parameters[name];
  } else {
    state[name] = default_value;
  }
}

function parse_and_validate_value_definitions(state, driver_data) {
  var value_map = {};

  if(!util.is_object_array(state.value_definitions)) {
    var logmsg = 'jsonevents error: value_definitions is not in the correct format. Terminating.';
    util.log(logmsg);
    process.exit();
  }

  for(var i = 0; i < state.value_definitions.length; i++) {
    var value = state.value_definitions[i];
    if(value['type'] == 'integer' && verify_fields(value, ['name','min_integer','max_integer'])) {
      value_map[value.name] = {type:'integer', min: value.min_integer, max: value.max_integer };
    } else if(value['type'] == 'float' && verify_fields(value, ['name','min_float','max_float'])) {
      value_map[value.name] = {type:'float', min: value.min_float, max: value.max_float };
    } else if(value['type'] == 'json_file' && verify_fields(value, ['name','file'])) {
      var json_array = load_json_array_file(value.file);
      value_map[value.name] = {type:'json_file', data: json_array };
    } else if(value['type'] == 'text_file' && verify_fields(value, ['name','file'])) {
      var text_array = load_string_file(value.file);
      value_map[value.name] = {type:'text_file', data: text_array };
    } else {
      var logmsg = 'jsonevents error: ' + JSON.stringify(value) + ' does not contain a valid type definition. Skipping.';
      util.log(logmsg);
    }
  }

  driver_data['value_map'] = value_map;
}

function verify_fields(obj, field_list) {
  for(var i = 0; i < field_list.length; i++) {
    if(!obj[field_list[i]]) {
      var logmsg = 'jsonevents error: ' + JSON.stringify(obj) + ' does not contain mandatory field ' + field_list[i] + '. Skipping.';
      util.log(logmsg);
      return false;
    }
  }

  return true;
}

function load_string_file(str_file) {
  try {
    var file_data = fs.readFileSync(str_file, {encoding: 'utf-8'});
    var string_array = file_data.split(/\r?\n/);
    return string_array;
  }
  catch (e) {
  	var logmsg = 'jsonevents error: unable to load text file ' + str_file + ': ' + e.message;
    util.log(logmsg);
    return undefined;
  }
}

function load_json_array_file(json_file) {
  var json_array;

  try {
    json_array = JSON.parse(fs.readFileSync(json_file, 'utf8'));
  }
  catch(e){
    var logmsg = 'jsonevents error: unable to load JSON file ' + json_file + ': ' + e.message + '. Terminating.';
    util.log(logmsg);
    process.exit();
  }
  
  if(!util.is_array(json_array)) {
    var logmsg = 'jsonevents error: Contents of JSON file ' + json_file + ' is not an array. Terminating.';
    util.log(logmsg);
    process.exit();
  }

  return json_array;
}

function count_response_errors(resp) {
  var error_count = 0;
  var results = resp.items;
  for(var i = 0; i < results.length; i++) {
    if(results[i]['create']['status'] >= 300) {
      error_count++;
    }
  }

  return error_count;
}

function generate_json_event(state, driver_data, field_value_map) {
  var evt = {};

  evt['body'] = util.clone(driver_data.template);
  
  evt['body']['@timestamp'] = generate_timestamp(state);
  
  if (state.time_index) {
    evt['index'] = state.index_prefix +
      evt['body']['@timestamp'].substr(0, 4) + '.' + evt['body']['@timestamp'].substr(5, 2) + '.' + evt['body']['@timestamp'].substr(8, 2);
  } else {
    evt['index'] = state.index_prefix;
  }

  for (var field in field_value_map) {  //field - value_key
    var value_name = field_value_map[field];
    if(driver_data.value_map[value_name]) {
      var value = driver_data.value_map[value_name];

      if(value['type'] == 'integer') {
        evt.body[field] = _.random(value['min'], value['max']);
      } else if(value['type'] == 'float') {
        evt.body[field] = _.random(value['min'], value['max'], true);
      } else {
        var idx = _.random(0, value.data.length - 1);
        evt.body[field] = value.data[idx];
      }
    }
  }

  return evt;
}
