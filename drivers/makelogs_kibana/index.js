
var _ = require('lodash');
var fs = require('fs');
var moment = require('moment');
var util = require('../../lib/util');

module.exports.init = function(esClient, parameters, driver_data) {
  var state = {};
  
  set_state_value('index', state, parameters, "rankin*");
  set_state_value('period', state, parameters, 30);
  set_state_value('timeout', state, parameters, 30000);
  set_state_value('use_text_filter', state, parameters, true);

  if (parameters && parameters['days']) {
    state.days = parse_days(parameters['days']);
  } else {
    state.days = parse_days('-1,0');
  }

  if (parameters && parameters['text_filter_file']) {
    state.text_filter_file = parameters['text_filter_file'];
    
    if(!driver_data[state.text_filter_file]) {
      var lines = load_string_file(parameters['text_filter_file']);

      if(lines == undefined) {
        process.exit();
      }

      driver_data[state.text_filter_file] = lines;
    }
  }

  return state;
}

module.exports.traffic = function(esClient, state, driver_data, operation_parameters, result_callback) {
  var timeout = state.timeout;
  if(operation_parameters.timeout && util.is_integer(operation_parameters.timeout) && operation_parameters.timeout > 0) {
    timeout = operation_parameters.timeout;
  }

  var use_text_filter = state.use_text_filter;
  if(operation_parameters.use_text_filter) {
    use_text_filter = operation_parameters.use_text_filter;
  }

  var end_ts = _.random(state.days.start, state.days.end);
  var start_ts = end_ts - (state.period * 24 * 3600 * 1000);

  if (state.text_filter_file && use_text_filter) {
    var text_filter = 'text: ' + driver_data[state.text_filter_file][_.random(0, driver_data[state.text_filter_file].length - 1)];
  } else {
    var text_filter = '*';
  }

  var bulk_body = [
    {"index":state.index,"search_type":"count","ignore_unavailable":true},
    {"query":{"filtered":{"query":{"query_string":{"query":"*","analyze_wildcard":true}},"filter":{"bool":{"must":[{"query":{"query_string":{"query":text_filter,"analyze_wildcard":true}}},{"range":{"@timestamp":{"gte":start_ts,"lte":end_ts,"format":"epoch_millis"}}}],"must_not":[]}}}},"size":0,"aggs":{"3":{"terms":{"field":"ip","size":10,"order":{"_count":"desc"}},"aggs":{"4":{"sum":{"field":"bytes"}}}}}},
    {"index":state.index,"search_type":"count","ignore_unavailable":true},
    {"size":0,"aggs":{"2":{"date_histogram":{"field":"@timestamp","interval":"1d","pre_zone":"+01:00","pre_zone_adjust_large_interval":true,"min_doc_count":1,"extended_bounds":{"min":start_ts,"max":end_ts,"format":"epoch_millis"}},"aggs":{"1":{"cardinality":{"field":"ip"}}}}},"highlight":{"pre_tags":["@kibana-highlighted-field@"],"post_tags":["@/kibana-highlighted-field@"],"fields":{"*":{}}},"query":{"filtered":{"query":{"match_all":{}},"filter":{"bool":{"must":[{"query":{"query_string":{"query":text_filter,"analyze_wildcard":true}}},{"range":{"@timestamp":{"gte":start_ts,"lte":end_ts,"format":"epoch_millis"}}}],"must_not":[]}}}}},
    {"index":state.index,"search_type":"count","ignore_unavailable":true},
    {"size":0,"aggs":{"2":{"date_histogram":{"field":"@timestamp","interval":"1d","pre_zone":"+01:00","pre_zone_adjust_large_interval":true,"min_doc_count":1,"extended_bounds":{"min":start_ts,"max":end_ts,"format":"epoch_millis"}},"aggs":{"3":{"terms":{"field":"response","size":5,"order":{"_count":"desc"}}}}}},"highlight":{"pre_tags":["@kibana-highlighted-field@"],"post_tags":["@/kibana-highlighted-field@"],"fields":{"*":{}}},"query":{"filtered":{"query":{"match_all":{}},"filter":{"bool":{"must":[{"query":{"query_string":{"query":text_filter,"analyze_wildcard":true}}},{"range":{"@timestamp":{"gte":start_ts,"lte":end_ts,"format":"epoch_millis"}}}],"must_not":[]}}}}},
    {"index":state.index,"search_type":"count","ignore_unavailable":true},
    {"size":0,"aggs":{"2":{"terms":{"field":"referer","size":10,"order":{"_count":"desc"}}}},"highlight":{"pre_tags":["@kibana-highlighted-field@"],"post_tags":["@/kibana-highlighted-field@"],"fields":{"*":{}}},"query":{"filtered":{"query":{"match_all":{}},"filter":{"bool":{"must":[{"query":{"query_string":{"query":text_filter,"analyze_wildcard":true}}},{"range":{"@timestamp":{"gte":start_ts,"lte":end_ts,"format":"epoch_millis"}}}],"must_not":[]}}}}},
    {"index":state.index,"search_type":"count","ignore_unavailable":true},
    {"size":0,"aggs":{"2":{"terms":{"field":"geo.src","size":10,"order":{"_count":"desc"}}}},"highlight":{"pre_tags":["@kibana-highlighted-field@"],"post_tags":["@/kibana-highlighted-field@"],"fields":{"*":{}}},"query":{"filtered":{"query":{"match_all":{}},"filter":{"bool":{"must":[{"query":{"query_string":{"query":text_filter,"analyze_wildcard":true}}},{"range":{"@timestamp":{"gte":start_ts,"lte":end_ts,"format":"epoch_millis"}}}],"must_not":[]}}}}},
    {"index":state.index,"search_type":"count","ignore_unavailable":true},
    {"size":0,"aggs":{"2":{"terms":{"field":"response","size":5,"order":{"_count":"desc"}}}},"highlight":{"pre_tags":["@kibana-highlighted-field@"],"post_tags":["@/kibana-highlighted-field@"],"fields":{"*":{}}},"query":{"filtered":{"query":{"match_all":{}},"filter":{"bool":{"must":[{"query":{"query_string":{"query":text_filter,"analyze_wildcard":true}}},{"range":{"@timestamp":{"gte":start_ts,"lte":end_ts,"format":"epoch_millis"}}}],"must_not":[]}}}}}
  ];

  esClient.msearch({
    preference: end_ts.toString(),
    body: bulk_body,
    requestTimeout: timeout
  }, function (err, resp) {
    if (err) {
      result_callback( { result_code: 'ERROR', visualizations: 6 } );
    }

    result_callback( { result_code: 'OK', visualizations: 6 } );
  });
}

module.exports.errors = function(esClient, state, driver_data, operation_parameters, result_callback) {
  var timeout = state.timeout;
  if(operation_parameters.timeout && util.is_integer(operation_parameters.timeout) && operation_parameters.timeout > 0) {
    timeout = operation_parameters.timeout;
  }

  var use_text_filter = state.use_text_filter;
  if(operation_parameters.use_text_filter) {
    use_text_filter = operation_parameters.use_text_filter;
  }

  var end_ts = _.random(state.days.start, state.days.end);
  var start_ts = end_ts - (state.period * 24 * 3600 * 1000);

  if (state.text_filter_file && use_text_filter) {
    var text_filter = 'text: ' + driver_data[state.text_filter_file][_.random(0, driver_data[state.text_filter_file].length - 1)];
  } else {
    var text_filter = '*';
  }

  var bulk_body = [
    {"index":state.index,"search_type":"count","ignore_unavailable":true},
    {"size":0,"aggs":{"2":{"terms":{"field":"host","size":5,"order":{"_count":"desc"}}}},"highlight":{"pre_tags":["@kibana-highlighted-field@"],"post_tags":["@/kibana-highlighted-field@"],"fields":{"*":{}}},"query":{"filtered":{"query":{"query_string":{"query":"*","analyze_wildcard":true}},"filter":{"bool":{"must":[{"query":{"match":{"response":{"query":"503","type":"phrase"}}}},{"query":{"query_string":{"query":text_filter,"analyze_wildcard":true}}},{"range":{"@timestamp":{"gte":start_ts,"lte":end_ts,"format":"epoch_millis"}}}],"must_not":[]}}}}},
    {"index":state.index,"search_type":"count","ignore_unavailable":true},
    {"size":0,"aggs":{"2":{"date_histogram":{"field":"@timestamp","interval":"1d","pre_zone":"+01:00","pre_zone_adjust_large_interval":true,"min_doc_count":1,"extended_bounds":{"min":start_ts,"max":end_ts,"format":"epoch_millis"}},"aggs":{"3":{"terms":{"field":"extension","size":5,"order":{"_count":"desc"}}}}}},"highlight":{"pre_tags":["@kibana-highlighted-field@"],"post_tags":["@/kibana-highlighted-field@"],"fields":{"*":{}},"fragment_size":2147483647},"query":{"filtered":{"query":{"query_string":{"query":"response: 503","analyze_wildcard":true}},"filter":{"bool":{"must":[{"query":{"query_string":{"query":text_filter,"analyze_wildcard":true}}},{"range":{"@timestamp":{"gte":start_ts,"lte":end_ts,"format":"epoch_millis"}}}],"must_not":[]}}}}},
    {"index":state.index,"search_type":"count","ignore_unavailable":true},
    {"size":0,"aggs":{"2":{"terms":{"field":"host","size":5,"order":{"_count":"desc"}},"aggs":{"3":{"terms":{"field":"extension","size":5,"order":{"_count":"desc"}}}}}},"highlight":{"pre_tags":["@kibana-highlighted-field@"],"post_tags":["@/kibana-highlighted-field@"],"fields":{"*":{}},"fragment_size":2147483647},"query":{"filtered":{"query":{"query_string":{"query":"response: 503","analyze_wildcard":true}},"filter":{"bool":{"must":[{"query":{"query_string":{"query":text_filter,"analyze_wildcard":true}}},{"range":{"@timestamp":{"gte":start_ts,"lte":end_ts,"format":"epoch_millis"}}}],"must_not":[]}}}}},
    {"index":state.index,"search_type":"count","ignore_unavailable":true},
    {"size":0,"aggs":{"2":{"terms":{"field":"request.raw","size":10,"order":{"_count":"desc"}}}},"highlight":{"pre_tags":["@kibana-highlighted-field@"],"post_tags":["@/kibana-highlighted-field@"],"fields":{"*":{}},"fragment_size":2147483647},"query":{"filtered":{"query":{"query_string":{"query":"response: 503","analyze_wildcard":true}},"filter":{"bool":{"must":[{"query":{"query_string":{"query":text_filter,"analyze_wildcard":true}}},{"range":{"@timestamp":{"gte":start_ts,"lte":end_ts,"format":"epoch_millis"}}}],"must_not":[]}}}}},
    {"index":state.index,"search_type":"count","ignore_unavailable":true},
    {"size":0,"aggs":{"2":{"terms":{"field":"geo.src","size":10,"order":{"_count":"desc"}}}},"highlight":{"pre_tags":["@kibana-highlighted-field@"],"post_tags":["@/kibana-highlighted-field@"],"fields":{"*":{}},"fragment_size":2147483647},"query":{"filtered":{"query":{"query_string":{"query":"response: 503","analyze_wildcard":true}},"filter":{"bool":{"must":[{"query":{"query_string":{"query":text_filter,"analyze_wildcard":true}}},{"range":{"@timestamp":{"gte":start_ts,"lte":end_ts,"format":"epoch_millis"}}}],"must_not":[]}}}}}
  ];

  esClient.msearch({
    preference: end_ts.toString(),
    body: bulk_body,
    requestTimeout: timeout
  }, function (err, resp) {
    if (err) {
      result_callback( { result_code: 'ERROR', visualizations: 5 } );
    }

    result_callback( { result_code: 'OK', visualizations: 5 } );
  });
}

module.exports.users = function(esClient, state, driver_data, operation_parameters, result_callback) {
  var timeout = state.timeout;
  if(operation_parameters.timeout && util.is_integer(operation_parameters.timeout) && operation_parameters.timeout > 0) {
    timeout = operation_parameters.timeout;
  }

  var use_text_filter = state.use_text_filter;
  if(operation_parameters.use_text_filter) {
    use_text_filter = operation_parameters.use_text_filter;
  }

  var end_ts = _.random(state.days.start, state.days.end);
  var start_ts = end_ts - (state.period * 24 * 3600 * 1000);

  if (state.text_filter_file && use_text_filter) {
    var text_filter = 'text: ' + driver_data[state.text_filter_file][_.random(0, driver_data[state.text_filter_file].length - 1)];
  } else {
    var text_filter = '*';
  }

  var bulk_body = [
    {"index":state.index,"search_type":"count","ignore_unavailable":true},
    {"query":{"filtered":{"query":{"query_string":{"query":"*","analyze_wildcard":true}},"filter":{"bool":{"must":[{"query":{"query_string":{"query":text_filter,"analyze_wildcard":true}}},{"range":{"@timestamp":{"gte":start_ts,"lte":end_ts,"format":"epoch_millis"}}}],"must_not":[]}}}},"size":0,"aggs":{"3":{"terms":{"field":"ip","size":10,"order":{"_count":"desc"}},"aggs":{"4":{"sum":{"field":"bytes"}}}}}},
    {"index":state.index,"search_type":"count","ignore_unavailable":true},
    {"size":0,"aggs":{"2":{"date_histogram":{"field":"@timestamp","interval":"1d","pre_zone":"+01:00","pre_zone_adjust_large_interval":true,"min_doc_count":1,"extended_bounds":{"min":start_ts,"max":end_ts,"format":"epoch_millis"}},"aggs":{"1":{"cardinality":{"field":"ip"}}}}},"highlight":{"pre_tags":["@kibana-highlighted-field@"],"post_tags":["@/kibana-highlighted-field@"],"fields":{"*":{}}},"query":{"filtered":{"query":{"match_all":{}},"filter":{"bool":{"must":[{"query":{"query_string":{"query":text_filter,"analyze_wildcard":true}}},{"range":{"@timestamp":{"gte":start_ts,"lte":end_ts,"format":"epoch_millis"}}}],"must_not":[]}}}}},
    {"index":state.index,"search_type":"count","ignore_unavailable":true},
    {"size":0,"aggs":{"2":{"terms":{"field":"geo.src","size":10,"order":{"_count":"desc"}},"aggs":{"3":{"terms":{"field":"machine.os","size":5,"order":{"_count":"desc"}}}}}},"highlight":{"pre_tags":["@kibana-highlighted-field@"],"post_tags":["@/kibana-highlighted-field@"],"fields":{"*":{}}},"query":{"filtered":{"query":{"match_all":{}},"filter":{"bool":{"must":[{"query":{"query_string":{"query":text_filter,"analyze_wildcard":true}}},{"range":{"@timestamp":{"gte":start_ts,"lte":end_ts,"format":"epoch_millis"}}}],"must_not":[]}}}}},
    {"index":state.index,"search_type":"count","ignore_unavailable":true},
    {"size":0,"aggs":{"2":{"terms":{"field":"machine.os","size":10,"order":{"_count":"desc"}},"aggs":{"3":{"terms":{"field":"agent.raw","size":5,"order":{"_count":"desc"}}}}}},"highlight":{"pre_tags":["@kibana-highlighted-field@"],"post_tags":["@/kibana-highlighted-field@"],"fields":{"*":{}}},"query":{"filtered":{"query":{"match_all":{}},"filter":{"bool":{"must":[{"query":{"query_string":{"query":text_filter,"analyze_wildcard":true}}},{"range":{"@timestamp":{"gte":start_ts,"lte":end_ts,"format":"epoch_millis"}}}],"must_not":[]}}}}},
    {"index":state.index,"search_type":"count","ignore_unavailable":true},
    {"size":0,"aggs":{"2":{"terms":{"field":"machine.os","size":10,"order":{"_count":"desc"}}}},"highlight":{"pre_tags":["@kibana-highlighted-field@"],"post_tags":["@/kibana-highlighted-field@"],"fields":{"*":{}}},"query":{"filtered":{"query":{"match_all":{}},"filter":{"bool":{"must":[{"query":{"query_string":{"query":text_filter,"analyze_wildcard":true}}},{"range":{"@timestamp":{"gte":start_ts,"lte":end_ts,"format":"epoch_millis"}}}],"must_not":[]}}}}}
  ];

  esClient.msearch({
    preference: end_ts.toString(),
    body: bulk_body,
    requestTimeout: timeout
  }, function (err, resp) {
    if (err) {
      result_callback( { result_code: 'ERROR', visualizations: 5 } );
    }

    result_callback( { result_code: 'OK', visualizations: 5 } );
  });
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
    var logmsg = 'makelogs_kibana error: unable to load file ' + str_file + ': ' + e.message;
    util.log(logmsg);
    return undefined;
  }
}
