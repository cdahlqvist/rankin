
var util = require('../../lib/util');

module.exports.init = function(esClient, parameters) {
	var state = {};
  
  set_state_value('log_count', state, parameters, false);
  set_state_value('log_health', state, parameters, false);
  set_state_value('index_pattern', state, parameters, '*');

	return state;
}

module.exports.count = function(esClient, state, result_callback) {
  esClient.count({
    index: state['index_pattern'],
    requestTimeout: 30000
  }, function (error, response) {
    if (error) {
      result_callback('ERROR');
    }

    if(state['log_result'] && (state['count'] === undefined || state['count'] !== response.count)) {
      var logmsg = 'example:count on index pattern ' + state.index_pattern + ' reported ' + response.count + ' hits.';
      util.log(logmsg);
      state['count'] = response.count;      
    }

    result_callback('OK');
  });
}

module.exports.ping = function(esClient, state, result_callback) {
  esClient.ping({
    requestTimeout: 30000
  }, function (error, response) {
    if (error) {
      result_callback('ERROR');
    }

    result_callback('OK');
  });
}

module.exports.cluster_health = function(esClient, state, result_callback) {
  esClient.cluster.health({
    requestTimeout: 30000
  }, function (error, response) {
    if (error) {
      result_callback('ERROR');
    }

    if(state['log_result'] && (state['health'] === undefined || state['health'] !== response.status)) {
      var logmsg = 'example:cluster_health is ' + response.status;
      util.log(logmsg);
      state['health'] = response.status;      
    }

    result_callback('OK');
  });
}

function set_state_value(name, state, parameters, default_value) {
  if (parameters && parameters[name]) {
    state[name] = parameters[name];
  } else {
    state[name] = default_value;
  }
}
	