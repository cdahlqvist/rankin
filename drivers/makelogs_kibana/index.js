
var _ = require('lodash');
var fs = require('fs');
var moment = require('moment');
var util = require('../../lib/util');

module.exports.init = function(esClient, parameters) {
  var state = {};
  
  set_state_value('index', state, parameters, "rankin*");
  set_state_value('period', state, parameters, 30);

  if (parameters && parameters['days']) {
    state.days = parse_days(parameters['days']);
  } else {
    state.days = parse_days('-1,0');
  }

  if (parameters && parameters['text_filter_file']) {
    if (parameters['_filter_terms_']) {
      state.filter_terms = parameters['_filter_terms_'];
    } else {
      var filter_terms = load_string_file(parameters['text_filter_file']);
      state.filter_terms = filter_terms;
      parameters['_filter_terms_'] = filter_terms;
    }
  }

  return state;
}

module.exports.dashboard1 = function(esClient, state, result_callback) {
  var end_ts = _.random(state.days.start, state.days.end);
  var start_ts = end_ts - (state.period * 24 * 3600 * 1000);

  if (state.filter_terms) {
    var text_filter = 'text: ' + state.filter_terms[_.random(0, state.filter_terms.length - 1)];
  } else {
    var text_filter = '*';
  }

  var bulk_body = [
    {"index":state.index,"search_type":"count","ignore_unavailable":true},
    {"query":{"filtered":{"query":{"query_string":{"query":"*","analyze_wildcard":true}},"filter":{"bool":{"must":[{"query":{"query_string":{"query":text_filter,"analyze_wildcard":true}}},{"range":{"@timestamp":{"gte":start_ts,"lte":end_ts}}}],"must_not":[]}}}},"size":0,"aggs":{"3":{"terms":{"field":"ip","size":20,"order":{"_count":"desc"}},"aggs":{"2":{"avg":{"field":"bytes"}},"4":{"sum":{"field":"bytes"}}}}}},
    {"index":state.index,"search_type":"count","ignore_unavailable":true},
    {"size":0,"aggs":{"2":{"date_histogram":{"field":"@timestamp","interval":"3h","pre_zone":"+01:00","pre_zone_adjust_large_interval":true,"min_doc_count":1,"extended_bounds":{"min":start_ts,"max":end_ts}},"aggs":{"3":{"terms":{"field":"extension","size":5,"order":{"1":"desc"}},"aggs":{"1":{"sum":{"field":"bytes"}}}}}}},"highlight":{"pre_tags":["@kibana-highlighted-field@"],"post_tags":["@/kibana-highlighted-field@"],"fields":{"*":{}}},"query":{"filtered":{"query":{"match_all":{}},"filter":{"bool":{"must":[{"query":{"query_string":{"query":text_filter,"analyze_wildcard":true}}},{"range":{"@timestamp":{"gte":start_ts,"lte":end_ts}}}],"must_not":[]}}}}},
    {"index":state.index,"search_type":"count","ignore_unavailable":true},
    {"size":0,"aggs":{"2":{"date_histogram":{"field":"@timestamp","interval":"12h","pre_zone":"+01:00","pre_zone_adjust_large_interval":true,"min_doc_count":1,"extended_bounds":{"min":start_ts,"max":end_ts}},"aggs":{"3":{"terms":{"field":"response","size":5,"order":{"_count":"desc"}}}}}},"highlight":{"pre_tags":["@kibana-highlighted-field@"],"post_tags":["@/kibana-highlighted-field@"],"fields":{"*":{}}},"query":{"filtered":{"query":{"match_all":{}},"filter":{"bool":{"must":[{"query":{"query_string":{"query":text_filter,"analyze_wildcard":true}}},{"range":{"@timestamp":{"gte":start_ts,"lte":end_ts}}}],"must_not":[]}}}}},
    {"index":state.index,"search_type":"count","ignore_unavailable":true},
    {"size":0,"aggs":{"2":{"terms":{"field":"response","size":5,"order":{"_count":"desc"}}}},"highlight":{"pre_tags":["@kibana-highlighted-field@"],"post_tags":["@/kibana-highlighted-field@"],"fields":{"*":{}}},"query":{"filtered":{"query":{"match_all":{}},"filter":{"bool":{"must":[{"query":{"query_string":{"query":text_filter,"analyze_wildcard":true}}},{"range":{"@timestamp":{"gte":start_ts,"lte":end_ts}}}],"must_not":[]}}}}},
    {"index":state.index,"search_type":"count","ignore_unavailable":true},
    {"size":0,"aggs":{"2":{"geohash_grid":{"field":"geo.coordinates","precision":5}}},"highlight":{"pre_tags":["@kibana-highlighted-field@"],"post_tags":["@/kibana-highlighted-field@"],"fields":{"*":{}}},"query":{"filtered":{"query":{"match_all":{}},"filter":{"bool":{"must":[{"query":{"query_string":{"query":text_filter,"analyze_wildcard":true}}},{"range":{"@timestamp":{"gte":start_ts,"lte":end_ts}}}],"must_not":[]}}}}},
    {"index":state.index,"search_type":"count","ignore_unavailable":true},
    {"size":0,"aggs":{"2":{"terms":{"field":"referer","size":20,"order":{"_count":"desc"}}}},"highlight":{"pre_tags":["@kibana-highlighted-field@"],"post_tags":["@/kibana-highlighted-field@"],"fields":{"*":{}}},"query":{"filtered":{"query":{"match_all":{}},"filter":{"bool":{"must":[{"query":{"query_string":{"query":text_filter,"analyze_wildcard":true}}},{"range":{"@timestamp":{"gte":start_ts,"lte":end_ts}}}],"must_not":[]}}}}},
    {"index":state.index,"search_type":"count","ignore_unavailable":true},
    {"size":0,"aggs":{"2":{"terms":{"field":"host","size":5,"order":{"_count":"desc"}}}},"highlight":{"pre_tags":["@kibana-highlighted-field@"],"post_tags":["@/kibana-highlighted-field@"],"fields":{"*":{}}},"query":{"filtered":{"query":{"query_string":{"query":"*","analyze_wildcard":true}},"filter":{"bool":{"must":[{"query":{"match":{"response":{"query":"503","type":"phrase"}}}},{"query":{"query_string":{"query":text_filter,"analyze_wildcard":true}}},{"range":{"@timestamp":{"gte":start_ts,"lte":end_ts}}}],"must_not":[]}}}}},
    {"index":state.index,"search_type":"count","ignore_unavailable":true},
    {"size":0,"aggs":{"2":{"terms":{"field":"machine.os","size":10,"order":{"_count":"desc"}},"aggs":{"3":{"range":{"field":"machine.ram","ranges":[{"from":0,"to":8589934593},{"from":8589934593,"to":10000000000}],"keyed":true}}}}},"highlight":{"pre_tags":["@kibana-highlighted-field@"],"post_tags":["@/kibana-highlighted-field@"],"fields":{"*":{}}},"query":{"filtered":{"query":{"match_all":{}},"filter":{"bool":{"must":[{"query":{"query_string":{"query":text_filter,"analyze_wildcard":true}}},{"range":{"@timestamp":{"gte":start_ts,"lte":end_ts}}}],"must_not":[]}}}}}
  ];

  esClient.msearch({
    body: bulk_body
  }, function (err, resp) {
    if (err) {
      result_callback('ERROR');
    }

    result_callback('OK');
  });
}

module.exports.dashboard2 = function(esClient, state, result_callback) {
  var end_ts = _.random(state.days.start, state.days.end);
  var start_ts = end_ts - (state.period * 24 * 3600 * 1000);

  if (state.filter_terms) {
    var text_filter = 'text: ' + state.filter_terms[_.random(0, state.filter_terms.length - 1)];
  } else {
    var text_filter = '*';
  }

  var bulk_body = [
    {"index":"rankin_all","ignore_unavailable":true},
    {"highlight":{"pre_tags":["@kibana-highlighted-field@"],"post_tags":["@/kibana-highlighted-field@"],"fields":{"*":{}}},"size":500,"sort":{"@timestamp":"desc"},"query":{"filtered":{"query":{"match_all":{}},"filter":{"bool":{"must":[{"query":{"query_string":{"analyze_wildcard":true,"query":text_filter}}},{"range":{"@timestamp":{"gte":start_ts,"lte":end_ts}}}],"must_not":[]}}}},"fields":["*","_source"],"script_fields":{},"fielddata_fields":["@timestamp"]},
    {"index":"rankin_all","search_type":"count","ignore_unavailable":true},
    {"query":{"filtered":{"query":{"query_string":{"query":"*","analyze_wildcard":true}},"filter":{"bool":{"must":[{"query":{"query_string":{"analyze_wildcard":true,"query":text_filter}}},{"range":{"@timestamp":{"gte":start_ts,"lte":end_ts}}}],"must_not":[]}}}},"size":0,"aggs":{"3":{"terms":{"field":"ip","size":20,"order":{"_count":"desc"}},"aggs":{"2":{"avg":{"field":"bytes"}},"4":{"sum":{"field":"bytes"}}}}}},
    {"index":"rankin_all","search_type":"count","ignore_unavailable":true},
    {"size":0,"aggs":{"2":{"date_histogram":{"field":"@timestamp","interval":"1d","pre_zone":"+01:00","pre_zone_adjust_large_interval":true,"min_doc_count":1,"extended_bounds":{"min":start_ts,"max":end_ts}},"aggs":{"1":{"cardinality":{"field":"ip"}}}}},"highlight":{"pre_tags":["@kibana-highlighted-field@"],"post_tags":["@/kibana-highlighted-field@"],"fields":{"*":{}}},"query":{"filtered":{"query":{"match_all":{}},"filter":{"bool":{"must":[{"query":{"query_string":{"analyze_wildcard":true,"query":text_filter}}},{"range":{"@timestamp":{"gte":start_ts,"lte":end_ts}}}],"must_not":[]}}}}},
    {"index":"rankin_all","search_type":"count","ignore_unavailable":true},
    {"size":0,"aggs":{"2":{"date_histogram":{"field":"@timestamp","interval":"3h","pre_zone":"+01:00","pre_zone_adjust_large_interval":true,"min_doc_count":1,"extended_bounds":{"min":start_ts,"max":end_ts}},"aggs":{"3":{"terms":{"field":"url","size":5,"order":{"1":"desc"}},"aggs":{"1":{"sum":{"field":"bytes"}}}}}}},"highlight":{"pre_tags":["@kibana-highlighted-field@"],"post_tags":["@/kibana-highlighted-field@"],"fields":{"*":{}}},"query":{"filtered":{"query":{"match_all":{}},"filter":{"bool":{"must":[{"query":{"query_string":{"analyze_wildcard":true,"query":text_filter}}},{"range":{"@timestamp":{"gte":start_ts,"lte":end_ts}}}],"must_not":[]}}}}},
    {"index":"rankin_all","search_type":"count","ignore_unavailable":true},
    {"size":0,"aggs":{"2":{"date_histogram":{"field":"@timestamp","interval":"12h","pre_zone":"+01:00","pre_zone_adjust_large_interval":true,"min_doc_count":1,"extended_bounds":{"min":start_ts,"max":end_ts}},"aggs":{"3":{"terms":{"field":"response","size":5,"order":{"_count":"desc"}}}}}},"highlight":{"pre_tags":["@kibana-highlighted-field@"],"post_tags":["@/kibana-highlighted-field@"],"fields":{"*":{}}},"query":{"filtered":{"query":{"match_all":{}},"filter":{"bool":{"must":[{"query":{"query_string":{"analyze_wildcard":true,"query":text_filter}}},{"range":{"@timestamp":{"gte":start_ts,"lte":end_ts}}}],"must_not":[]}}}}},
    {"index":"rankin_all","search_type":"count","ignore_unavailable":true},
    {"size":0,"aggs":{"2":{"terms":{"field":"response","size":5,"order":{"_count":"desc"}}}},"highlight":{"pre_tags":["@kibana-highlighted-field@"],"post_tags":["@/kibana-highlighted-field@"],"fields":{"*":{}}},"query":{"filtered":{"query":{"match_all":{}},"filter":{"bool":{"must":[{"query":{"query_string":{"analyze_wildcard":true,"query":text_filter}}},{"range":{"@timestamp":{"gte":start_ts,"lte":end_ts}}}],"must_not":[]}}}}},
    {"index":"rankin_all","search_type":"count","ignore_unavailable":true},
    {"size":0,"aggs":{"2":{"date_histogram":{"field":"@timestamp","interval":"12h","pre_zone":"+01:00","pre_zone_adjust_large_interval":true,"min_doc_count":1,"extended_bounds":{"min":start_ts,"max":end_ts}},"aggs":{"3":{"terms":{"field":"geo.src","size":10,"order":{"1":"desc"}},"aggs":{"1":{"cardinality":{"field":"ip"}}}}}}},"highlight":{"pre_tags":["@kibana-highlighted-field@"],"post_tags":["@/kibana-highlighted-field@"],"fields":{"*":{}}},"query":{"filtered":{"query":{"match_all":{}},"filter":{"bool":{"must":[{"query":{"query_string":{"analyze_wildcard":true,"query":text_filter}}},{"range":{"@timestamp":{"gte":start_ts,"lte":end_ts}}}],"must_not":[]}}}}}
  ];

  esClient.msearch({
    body: bulk_body
  }, function (err, resp) {
    if (err) {
      result_callback('ERROR');
    }

    result_callback('OK');
  });
}

module.exports.dashboard3 = function(esClient, state, result_callback) {
  var end_ts = _.random(state.days.start, state.days.end);
  var start_ts = end_ts - (state.period * 24 * 3600 * 1000);

  if (state.filter_terms) {
    var text_filter = 'text: ' + state.filter_terms[_.random(0, state.filter_terms.length - 1)];
  } else {
    var text_filter = '*';
  }

  var bulk_body = [
    {"index":"rankin_all","search_type":"count","ignore_unavailable":true},
    {"query":{"filtered":{"query":{"query_string":{"query":"*","analyze_wildcard":true}},"filter":{"bool":{"must":[{"query":{"query_string":{"query":text_filter,"analyze_wildcard":true}}},{"range":{"@timestamp":{"gte":start_ts,"lte":end_ts}}}],"must_not":[]}}}},"size":0,"aggs":{"3":{"terms":{"field":"ip","size":20,"order":{"_count":"desc"}},"aggs":{"2":{"avg":{"field":"bytes"}},"4":{"sum":{"field":"bytes"}}}}}},
    {"index":"rankin_all","search_type":"count","ignore_unavailable":true},
    {"size":0,"aggs":{"2":{"date_histogram":{"field":"@timestamp","interval":"3h","pre_zone":"+01:00","pre_zone_adjust_large_interval":true,"min_doc_count":1,"extended_bounds":{"min":start_ts,"max":end_ts}},"aggs":{"3":{"terms":{"field":"extension","size":5,"order":{"1":"desc"}},"aggs":{"1":{"sum":{"field":"bytes"}}}}}}},"highlight":{"pre_tags":["@kibana-highlighted-field@"],"post_tags":["@/kibana-highlighted-field@"],"fields":{"*":{}}},"query":{"filtered":{"query":{"match_all":{}},"filter":{"bool":{"must":[{"query":{"query_string":{"query":text_filter,"analyze_wildcard":true}}},{"range":{"@timestamp":{"gte":start_ts,"lte":end_ts}}}],"must_not":[]}}}}},
    {"index":"rankin_all","search_type":"count","ignore_unavailable":true},
    {"size":0,"aggs":{"2":{"date_histogram":{"field":"@timestamp","interval":"12h","pre_zone":"+01:00","pre_zone_adjust_large_interval":true,"min_doc_count":1,"extended_bounds":{"min":start_ts,"max":end_ts}},"aggs":{"3":{"terms":{"field":"response","size":5,"order":{"_count":"desc"}}}}}},"highlight":{"pre_tags":["@kibana-highlighted-field@"],"post_tags":["@/kibana-highlighted-field@"],"fields":{"*":{}}},"query":{"filtered":{"query":{"match_all":{}},"filter":{"bool":{"must":[{"query":{"query_string":{"query":text_filter,"analyze_wildcard":true}}},{"range":{"@timestamp":{"gte":start_ts,"lte":end_ts}}}],"must_not":[]}}}}},
    {"index":"rankin_all","search_type":"count","ignore_unavailable":true},
    {"size":0,"aggs":{"2":{"date_histogram":{"field":"@timestamp","interval":"12h","pre_zone":"+01:00","pre_zone_adjust_large_interval":true,"min_doc_count":1,"extended_bounds":{"min":start_ts,"max":end_ts}},"aggs":{"3":{"terms":{"field":"geo.src","size":10,"order":{"1":"desc"}},"aggs":{"1":{"cardinality":{"field":"ip"}}}}}}},"highlight":{"pre_tags":["@kibana-highlighted-field@"],"post_tags":["@/kibana-highlighted-field@"],"fields":{"*":{}}},"query":{"filtered":{"query":{"match_all":{}},"filter":{"bool":{"must":[{"query":{"query_string":{"query":text_filter,"analyze_wildcard":true}}},{"range":{"@timestamp":{"gte":start_ts,"lte":end_ts}}}],"must_not":[]}}}}},
    {"index":"rankin_all","search_type":"count","ignore_unavailable":true},
    {"size":0,"aggs":{"2":{"terms":{"field":"response","size":5,"order":{"_count":"desc"}}}},"highlight":{"pre_tags":["@kibana-highlighted-field@"],"post_tags":["@/kibana-highlighted-field@"],"fields":{"*":{}}},"query":{"filtered":{"query":{"match_all":{}},"filter":{"bool":{"must":[{"query":{"query_string":{"query":text_filter,"analyze_wildcard":true}}},{"range":{"@timestamp":{"gte":start_ts,"lte":end_ts}}}],"must_not":[]}}}}},
    {"index":"rankin_all","search_type":"count","ignore_unavailable":true},
    {"size":0,"aggs":{"2":{"terms":{"field":"referer","size":20,"order":{"_count":"desc"}}}},"highlight":{"pre_tags":["@kibana-highlighted-field@"],"post_tags":["@/kibana-highlighted-field@"],"fields":{"*":{}}},"query":{"filtered":{"query":{"match_all":{}},"filter":{"bool":{"must":[{"query":{"query_string":{"query":text_filter,"analyze_wildcard":true}}},{"range":{"@timestamp":{"gte":start_ts,"lte":end_ts}}}],"must_not":[]}}}}},
    {"index":"rankin_all","search_type":"count","ignore_unavailable":true},
    {"size":0,"aggs":{"2":{"terms":{"field":"host","size":5,"order":{"_count":"desc"}}}},"highlight":{"pre_tags":["@kibana-highlighted-field@"],"post_tags":["@/kibana-highlighted-field@"],"fields":{"*":{}}},"query":{"filtered":{"query":{"query_string":{"query":"*","analyze_wildcard":true}},"filter":{"bool":{"must":[{"query":{"match":{"response":{"query":"503","type":"phrase"}}}},{"query":{"query_string":{"query":text_filter,"analyze_wildcard":true}}},{"range":{"@timestamp":{"gte":start_ts,"lte":end_ts}}}],"must_not":[]}}}}}
  ];

  esClient.msearch({
    body: bulk_body
  }, function (err, resp) {
    if (err) {
      result_callback('ERROR');
    }

    result_callback('OK');
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
