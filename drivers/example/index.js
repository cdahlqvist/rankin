
var util = require('../../lib/util');

module.exports.init = function(esClient, parameters) {
	var state = {};
  
  if (parameters && parameters['log_count']) {
    state['log_count'] = parameters['log_count'];
  } else {
    state['log_count'] = false;
  }

  if (parameters && parameters['log_health']) {
    state['log_health'] = parameters['log_health'];
  } else {
    state['log_health'] = false;
  }

	if (parameters && parameters['index_pattern']) {
		state['index_pattern'] = parameters['index_pattern'];
	} else {
		state['index_pattern'] = '*';
	}

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
	