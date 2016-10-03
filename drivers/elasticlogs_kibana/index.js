
var _ = require('lodash');
var fs = require('fs');
var moment = require('moment');
var util = require('../../lib/util');

module.exports.init = function(esClient, parameters, driver_data) {
  var state = {};
  
  set_state_value('index_list', state, parameters, ["rankin*"]);
  set_state_value('interval_days', state, parameters, 30);
  set_state_value('timeout', state, parameters, 30000);
  set_state_value('use_text_filter', state, parameters, false);
  set_state_value('date_histogram_interval', state, parameters, "1d");
  set_state_value('elasticsearch_version', state, parameters, "5.0");

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
  var index_pattern = state.index_list[_.random(0, state.index_list.length - 1)];

  var timeout = state.timeout;
  if(operation_parameters.timeout && util.is_integer(operation_parameters.timeout) && operation_parameters.timeout > 0) {
    timeout = operation_parameters.timeout;
  }

  var use_text_filter = state.use_text_filter;
  if(operation_parameters.use_text_filter) {
    use_text_filter = operation_parameters.use_text_filter;
  }

  var date_histogram_interval = state.date_histogram_interval;
  if(operation_parameters.date_histogram_interval) {
    date_histogram_interval = operation_parameters.date_histogram_interval;
  }

  var interval_days = state.interval_days;
  if(operation_parameters.interval_days) {
    interval_days = operation_parameters.interval_days;
  }

  var end_ts = _.random(state.days.start, state.days.end);
  var start_ts = end_ts - (interval_days * 24 * 3600 * 1000);

  if (state.text_filter_file && use_text_filter) {
    var text_filter = driver_data[state.text_filter_file][_.random(0, driver_data[state.text_filter_file].length - 1)];
  } else {
    var text_filter = '*';
  }

  var msearch_body;
  if (state.elasticsearch_version.substring(0, 1) == "5") {
    msearch_body = [
      {"index":index_pattern,"ignore_unavailable":true},
      {"query":{"bool":{"must":[{"query_string":{"query":"*","analyze_wildcard":true}},{"query_string":{"query":text_filter,"analyze_wildcard":true}},{"range":{"@timestamp":{"gte":start_ts,"lte":end_ts,"format":"epoch_millis"}}}],"must_not":[]}},"size":0,"aggs":{}},
      {"index":index_pattern,"ignore_unavailable":true},
      {"size":0,"aggs":{"2":{"terms":{"field":"request.raw","size":20,"order":{"_count":"desc"}}}},"query":{"bool":{"must":[{"query_string":{"analyze_wildcard":true,"query":"*"}},{"query_string":{"query":text_filter,"analyze_wildcard":true}},{"range":{"@timestamp":{"gte":start_ts,"lte":end_ts,"format":"epoch_millis"}}}],"must_not":[]}},"highlight":{"pre_tags":["@kibana-highlighted-field@"],"post_tags":["@/kibana-highlighted-field@"],"fields":{"*":{}},"require_field_match":false,"fragment_size":2147483647}},
      {"index":index_pattern,"ignore_unavailable":true},
      {"size":0,"aggs":{"2":{"terms":{"field":"geoip.country_name","size":10,"order":{"_count":"desc"}}}},"query":{"bool":{"must":[{"query_string":{"analyze_wildcard":true,"query":"*"}},{"query_string":{"query":text_filter,"analyze_wildcard":true}},{"range":{"@timestamp":{"gte":start_ts,"lte":end_ts,"format":"epoch_millis"}}}],"must_not":[]}},"highlight":{"pre_tags":["@kibana-highlighted-field@"],"post_tags":["@/kibana-highlighted-field@"],"fields":{"*":{}},"require_field_match":false,"fragment_size":2147483647}},
      {"index":index_pattern,"ignore_unavailable":true},
      {"size":0,"aggs":{"4":{"terms":{"field":"useragent.os_name","size":10,"order":{"_count":"desc"}}}},"query":{"bool":{"must":[{"query_string":{"analyze_wildcard":true,"query":"*"}},{"query_string":{"query":text_filter,"analyze_wildcard":true}},{"range":{"@timestamp":{"gte":start_ts,"lte":end_ts,"format":"epoch_millis"}}}],"must_not":[]}},"highlight":{"pre_tags":["@kibana-highlighted-field@"],"post_tags":["@/kibana-highlighted-field@"],"fields":{"*":{}},"require_field_match":false,"fragment_size":2147483647}},
      {"index":index_pattern,"ignore_unavailable":true},
      {"size":0,"aggs":{"2":{"date_histogram":{"field":"@timestamp","interval":date_histogram_interval,"time_zone":"Europe/London","min_doc_count":1},"aggs":{"3":{"terms":{"field":"response","size":10,"order":{"_count":"desc"}}}}}},"query":{"bool":{"must":[{"query_string":{"analyze_wildcard":true,"query":"*"}},{"query_string":{"query":text_filter,"analyze_wildcard":true}},{"range":{"@timestamp":{"gte":start_ts,"lte":end_ts,"format":"epoch_millis"}}}],"must_not":[]}},"highlight":{"pre_tags":["@kibana-highlighted-field@"],"post_tags":["@/kibana-highlighted-field@"],"fields":{"*":{}},"require_field_match":false,"fragment_size":2147483647}},
      {"index":index_pattern,"ignore_unavailable":true},
      {"size":0,"aggs":{"2":{"geohash_grid":{"field":"geoip.location","precision":2}}},"query":{"bool":{"must":[{"query_string":{"analyze_wildcard":true,"query":"*"}},{"query_string":{"query":text_filter,"analyze_wildcard":true}},{"range":{"@timestamp":{"gte":start_ts,"lte":end_ts,"format":"epoch_millis"}}}],"must_not":[]}},"highlight":{"pre_tags":["@kibana-highlighted-field@"],"post_tags":["@/kibana-highlighted-field@"],"fields":{"*":{}},"require_field_match":false,"fragment_size":2147483647}}
    ];
   } else {
    msearch_body = [
      {"index":index_pattern,"search_type":"count","ignore_unavailable":true},
      {"query":{"filtered":{"query":{"query_string":{"query":"*","analyze_wildcard":true}},"filter":{"bool":{"must":[{"query":{"query_string":{"query":text_filter,"analyze_wildcard":true}}},{"range":{"@timestamp":{"gte":start_ts,"lte":end_ts,"format":"epoch_millis"}}}],"must_not":[]}}}},"size":0,"aggs":{}},
      {"index":index_pattern,"search_type":"count","ignore_unavailable":true},
      {"size":0,"aggs":{"2":{"terms":{"field":"request.raw","size":20,"order":{"_count":"desc"}}}},"query":{"filtered":{"query":{"query_string":{"analyze_wildcard":true,"query":"*"}},"filter":{"bool":{"must":[{"query":{"query_string":{"query":text_filter,"analyze_wildcard":true}}},{"range":{"@timestamp":{"gte":start_ts,"lte":end_ts,"format":"epoch_millis"}}}],"must_not":[]}}}},"highlight":{"pre_tags":["@kibana-highlighted-field@"],"post_tags":["@/kibana-highlighted-field@"],"fields":{"*":{}},"require_field_match":false,"fragment_size":2147483647}},
      {"index":index_pattern,"search_type":"count","ignore_unavailable":true},
      {"size":0,"aggs":{"2":{"terms":{"field":"geoip.country_name","size":10,"order":{"_count":"desc"}}}},"query":{"filtered":{"query":{"query_string":{"analyze_wildcard":true,"query":"*"}},"filter":{"bool":{"must":[{"query":{"query_string":{"query":text_filter,"analyze_wildcard":true}}},{"range":{"@timestamp":{"gte":start_ts,"lte":end_ts,"format":"epoch_millis"}}}],"must_not":[]}}}},"highlight":{"pre_tags":["@kibana-highlighted-field@"],"post_tags":["@/kibana-highlighted-field@"],"fields":{"*":{}},"require_field_match":false,"fragment_size":2147483647}},
      {"index":index_pattern,"search_type":"count","ignore_unavailable":true},
      {"size":0,"aggs":{"2":{"date_histogram":{"field":"@timestamp","interval":date_histogram_interval,"time_zone":"Europe/London","min_doc_count":1,"extended_bounds":{"min":start_ts,"max":end_ts}},"aggs":{"3":{"terms":{"field":"response","size":10,"order":{"_count":"desc"}}}}}},"query":{"filtered":{"query":{"query_string":{"analyze_wildcard":true,"query":"*"}},"filter":{"bool":{"must":[{"query":{"query_string":{"query":text_filter,"analyze_wildcard":true}}},{"range":{"@timestamp":{"gte":start_ts,"lte":end_ts,"format":"epoch_millis"}}}],"must_not":[]}}}},"highlight":{"pre_tags":["@kibana-highlighted-field@"],"post_tags":["@/kibana-highlighted-field@"],"fields":{"*":{}},"require_field_match":false,"fragment_size":2147483647}},
      {"index":index_pattern,"search_type":"count","ignore_unavailable":true},
      {"size":0,"aggs":{"2":{"geohash_grid":{"field":"geoip.location","precision":2}}},"query":{"filtered":{"query":{"query_string":{"analyze_wildcard":true,"query":"*"}},"filter":{"bool":{"must":[{"query":{"query_string":{"query":text_filter,"analyze_wildcard":true}}},{"range":{"@timestamp":{"gte":start_ts,"lte":end_ts,"format":"epoch_millis"}}}],"must_not":[]}}}},"highlight":{"pre_tags":["@kibana-highlighted-field@"],"post_tags":["@/kibana-highlighted-field@"],"fields":{"*":{}},"require_field_match":false,"fragment_size":2147483647}},
      {"index":index_pattern,"search_type":"count","ignore_unavailable":true},
      {"size":0,"aggs":{"4":{"terms":{"field":"useragent.os_name","size":10,"order":{"_count":"desc"}}}},"query":{"filtered":{"query":{"query_string":{"analyze_wildcard":true,"query":"*"}},"filter":{"bool":{"must":[{"query":{"query_string":{"query":text_filter,"analyze_wildcard":true}}},{"range":{"@timestamp":{"gte":start_ts,"lte":end_ts,"format":"epoch_millis"}}}],"must_not":[]}}}},"highlight":{"pre_tags":["@kibana-highlighted-field@"],"post_tags":["@/kibana-highlighted-field@"],"fields":{"*":{}},"require_field_match":false,"fragment_size":2147483647}}
    ];
  } 

  esClient.msearch({
    preference: end_ts.toString(),
    body: msearch_body,
    requestTimeout: timeout
  }, function (err, resp) {
    if (err) {
      result_callback( { result_code: 'ERROR', visualizations: 6, index: index_pattern, text_filter_used: text_filter, interval_days: interval_days, date_histogram_interval: date_histogram_interval } );
    } else {
      result_callback( { result_code: 'OK', visualizations: 6, index: index_pattern, text_filter_used: text_filter, interval_days: interval_days, date_histogram_interval: date_histogram_interval } );
    }
  });
}

module.exports.content_issues = function(esClient, state, driver_data, operation_parameters, result_callback) {
  var index_pattern = state.index_list[_.random(0, state.index_list.length - 1)];

  var timeout = state.timeout;
  if(operation_parameters.timeout && util.is_integer(operation_parameters.timeout) && operation_parameters.timeout > 0) {
    timeout = operation_parameters.timeout;
  }

  var use_text_filter = state.use_text_filter;
  if(operation_parameters.use_text_filter) {
    use_text_filter = operation_parameters.use_text_filter;
  }

  var date_histogram_interval = state.date_histogram_interval;
  if(operation_parameters.date_histogram_interval) {
    date_histogram_interval = operation_parameters.date_histogram_interval;
  }

  var interval_days = state.interval_days;
  if(operation_parameters.interval_days) {
    interval_days = operation_parameters.interval_days;
  }

  var end_ts = _.random(state.days.start, state.days.end);
  var start_ts = end_ts - (interval_days * 24 * 3600 * 1000);

  if (state.text_filter_file && use_text_filter) {
    var text_filter = driver_data[state.text_filter_file][_.random(0, driver_data[state.text_filter_file].length - 1)];
  } else {
    var text_filter = '*';
  }

  var msearch_body;
  if (state.elasticsearch_version.substring(0, 1) == "5") {
    msearch_body = [
      {"index":index_pattern,"ignore_unavailable":true},
      {"query":{"bool":{"must":[{"query_string":{"query":"*","analyze_wildcard":true}},{"query_string":{"query":text_filter,"analyze_wildcard":true}},{"range":{"@timestamp":{"gte":start_ts,"lte":end_ts,"format":"epoch_millis"}}}],"must_not":[]}},"size":0,"aggs":{}},
      {"index":index_pattern,"ignore_unavailable":true},
      {"size":0,"aggs":{"2":{"date_histogram":{"field":"@timestamp","interval":date_histogram_interval,"time_zone":"Europe/London","min_doc_count":1}}},"highlight":{"pre_tags":["@kibana-highlighted-field@"],"post_tags":["@/kibana-highlighted-field@"],"fields":{"*":{}},"require_field_match":false,"fragment_size":2147483647},"query":{"bool":{"must":[{"query_string":{"query":"*","analyze_wildcard":true}},{"match":{"response":{"query":404,"type":"phrase"}}},{"query_string":{"query":text_filter,"analyze_wildcard":true}},{"range":{"@timestamp":{"gte":start_ts,"lte":1469879774921,"format":"epoch_millis"}}}],"must_not":[]}}},
      {"index":index_pattern,"ignore_unavailable":true},
      {"size":0,"aggs":{"2":{"terms":{"field":"referrer.raw","size":20,"order":{"_count":"desc"}}}},"highlight":{"pre_tags":["@kibana-highlighted-field@"],"post_tags":["@/kibana-highlighted-field@"],"fields":{"*":{}},"require_field_match":false,"fragment_size":2147483647},"query":{"bool":{"must":[{"query_string":{"query":"*","analyze_wildcard":true}},{"match":{"response":{"query":404,"type":"phrase"}}},{"query_string":{"query":text_filter,"analyze_wildcard":true}},{"range":{"@timestamp":{"gte":start_ts,"lte":1469879774921,"format":"epoch_millis"}}}],"must_not":[]}}},
      {"index":index_pattern,"ignore_unavailable":true},
      {"size":0,"aggs":{"2":{"terms":{"field":"request.raw","size":20,"order":{"_count":"desc"}}}},"highlight":{"pre_tags":["@kibana-highlighted-field@"],"post_tags":["@/kibana-highlighted-field@"],"fields":{"*":{}},"require_field_match":false,"fragment_size":2147483647},"query":{"bool":{"must":[{"query_string":{"query":"*","analyze_wildcard":true}},{"match":{"response":{"query":404,"type":"phrase"}}},{"query_string":{"query":text_filter,"analyze_wildcard":true}},{"range":{"@timestamp":{"gte":start_ts,"lte":1469879774921,"format":"epoch_millis"}}}],"must_not":[]}}},
      {"index":index_pattern,"ignore_unavailable":true},
      {"size":0,"aggs":{"2":{"filters":{"filters":{"Internal referrals":{"query_string":{"query":"referrer: \"www.elastic.co\"","analyze_wildcard":true}},"External referrals":{"query_string":{"query":"-referrer: \"www.elastic.co\"","analyze_wildcard":true}}}}}},"highlight":{"pre_tags":["@kibana-highlighted-field@"],"post_tags":["@/kibana-highlighted-field@"],"fields":{"*":{}},"require_field_match":false,"fragment_size":2147483647},"query":{"bool":{"must":[{"query_string":{"query":"*","analyze_wildcard":true}},{"match":{"response":{"query":404,"type":"phrase"}}},{"query_string":{"query":text_filter,"analyze_wildcard":true}},{"range":{"@timestamp":{"gte":start_ts,"lte":1469879774921,"format":"epoch_millis"}}}],"must_not":[]}}}
    ];
  } else {
    msearch_body = [
      {"index":index_pattern,"search_type":"count","ignore_unavailable":true},
      {"query":{"filtered":{"query":{"query_string":{"query":"*","analyze_wildcard":true}},"filter":{"bool":{"must":[{"query":{"query_string":{"query":text_filter,"analyze_wildcard":true}}},{"range":{"@timestamp":{"gte":start_ts,"lte":end_ts,"format":"epoch_millis"}}}],"must_not":[]}}}},"size":0,"aggs":{}},
      {"index":index_pattern,"search_type":"count","ignore_unavailable":true},
      {"size":0,"aggs":{"2":{"date_histogram":{"field":"@timestamp","interval":date_histogram_interval,"time_zone":"Europe/London","min_doc_count":1,"extended_bounds":{"min":start_ts,"max":end_ts}}}},"highlight":{"pre_tags":["@kibana-highlighted-field@"],"post_tags":["@/kibana-highlighted-field@"],"fields":{"*":{}},"require_field_match":false,"fragment_size":2147483647},"query":{"filtered":{"query":{"query_string":{"query":"*","analyze_wildcard":true}},"filter":{"bool":{"must":[{"query":{"match":{"response":{"query":404,"type":"phrase"}}}},{"query":{"query_string":{"query":text_filter,"analyze_wildcard":true}}},{"range":{"@timestamp":{"gte":start_ts,"lte":end_ts,"format":"epoch_millis"}}}],"must_not":[]}}}}},
      {"index":index_pattern,"search_type":"count","ignore_unavailable":true},
      {"size":0,"aggs":{"2":{"terms":{"field":"request.raw","size":20,"order":{"_count":"desc"}}}},"highlight":{"pre_tags":["@kibana-highlighted-field@"],"post_tags":["@/kibana-highlighted-field@"],"fields":{"*":{}},"require_field_match":false,"fragment_size":2147483647},"query":{"filtered":{"query":{"query_string":{"query":"*","analyze_wildcard":true}},"filter":{"bool":{"must":[{"query":{"match":{"response":{"query":404,"type":"phrase"}}}},{"query":{"query_string":{"query":text_filter,"analyze_wildcard":true}}},{"range":{"@timestamp":{"gte":start_ts,"lte":end_ts,"format":"epoch_millis"}}}],"must_not":[]}}}}},
      {"index":index_pattern,"search_type":"count","ignore_unavailable":true},
      {"size":0,"aggs":{"2":{"terms":{"field":"referrer.raw","size":20,"order":{"_count":"desc"}}}},"highlight":{"pre_tags":["@kibana-highlighted-field@"],"post_tags":["@/kibana-highlighted-field@"],"fields":{"*":{}},"require_field_match":false,"fragment_size":2147483647},"query":{"filtered":{"query":{"query_string":{"query":"*","analyze_wildcard":true}},"filter":{"bool":{"must":[{"query":{"match":{"response":{"query":404,"type":"phrase"}}}},{"query":{"query_string":{"query":text_filter,"analyze_wildcard":true}}},{"range":{"@timestamp":{"gte":start_ts,"lte":end_ts,"format":"epoch_millis"}}}],"must_not":[]}}}}},
      {"index":index_pattern,"search_type":"count","ignore_unavailable":true},
      {"size":0,"aggs":{"2":{"filters":{"filters":{"Internal referrals":{"query":{"query_string":{"query":"referrer: \"www.elastic.co\"","analyze_wildcard":true}}},"External referrals":{"query":{"query_string":{"query":"-referrer: \"www.elastic.co\"","analyze_wildcard":true}}}}}}},"highlight":{"pre_tags":["@kibana-highlighted-field@"],"post_tags":["@/kibana-highlighted-field@"],"fields":{"*":{}},"require_field_match":false,"fragment_size":2147483647},"query":{"filtered":{"query":{"query_string":{"query":"*","analyze_wildcard":true}},"filter":{"bool":{"must":[{"query":{"match":{"response":{"query":404,"type":"phrase"}}}},{"query":{"query_string":{"query":text_filter,"analyze_wildcard":true}}},{"range":{"@timestamp":{"gte":start_ts,"lte":end_ts,"format":"epoch_millis"}}}],"must_not":[]}}}}}
    ];
  }

  esClient.msearch({
    preference: end_ts.toString(),
    body: msearch_body,
    requestTimeout: timeout
  }, function (err, resp) {
    if (err) {
      result_callback( { result_code: 'ERROR', visualizations: 5, index: index_pattern, text_filter_used: text_filter, interval_days: interval_days, date_histogram_interval: date_histogram_interval } );
    } else {
      result_callback( { result_code: 'OK', visualizations: 5, index: index_pattern, text_filter_used: text_filter, interval_days: interval_days, date_histogram_interval: date_histogram_interval } );
    }
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
    var logmsg = 'elasticlogs_kibana error: unable to load file ' + str_file + ': ' + e.message;
    util.log(logmsg);
    return undefined;
  }
}
