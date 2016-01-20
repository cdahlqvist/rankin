
module.exports.init = function(esClient, parameters, driver_data) {
  var state = {};

  set_state_value('index_pattern', state, parameters, '*');

	return state;
}

module.exports.count = function(esClient, state, driver_data, operation_parameters, result_callback) {
  var index_pattern = state['index_pattern'];

  if(operation_parameters.index_pattern) {
    index_pattern = operation_parameters.index_pattern;
  }

  esClient.count({
    index: index_pattern,
    requestTimeout: 30000
  }, function (error, response) {
    if (error) {
      result_callback( { 'result_code': 'ERROR' } );
    }

    result_callback( { 'result_code': 'OK', 'count': response.count } );
  });
}

module.exports.ping = function(esClient, state, driver_data, operation_parameters, result_callback) {
  esClient.ping({
    requestTimeout: 30000
  }, function (error, response) {
    if (error) {
      result_callback('ERROR');
    }

    result_callback('OK');
  });
}

module.exports.cluster_health = function(esClient, state, driver_data, operation_parameters, result_callback) {
  esClient.cluster.health({
    requestTimeout: 30000
  }, function (error, response) {
    if (error) {
      result_callback('ERROR');
    }

    result_callback( { 'result_code': 'OK', 'cluster_status': response.status } );
  });
}

function set_state_value(name, state, parameters, default_value) {
  if (parameters && parameters[name]) {
    state[name] = parameters[name];
  } else {
    state[name] = default_value;
  }
}
	