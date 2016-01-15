# Driver: example
This simple driver has been created as an example of how a driver can be designed, and should be possible to use as a template for more complex drivers.

## Operations
This driver supports the following 3 Elasticsearch operations:

### count
This operation will count all records in indices matching the configuration parameter **index_pattern**, which defaults to '\*'. The returned count will be passed back as part of the results object.

It is also possible to specify the **index_pattern** in the parameters passed to each individual operation.

### ping
Performs a simple ping against the Elasticsearch cluster.

### cluster_health
This operation will check the cluster status (*green*, *yellow* or *red*) and will return this as part of the result.

## Example Configuration File
Below is a sample configuration file that shows how the driver can be invoked. In this example a single worker will be used to generate 2 requests per second. The mix of operations will be 20% **ping**, 20% **cluster_health** and 60% **count** operations for two different index patterns. All count operations taking longer than 200 ms will be counted as having breached the SLA.

```
{
  "run": {
    "cluster":"test_cluster"
  },
  "jobs": [
    {
      "job_id": "job1",
      "concurrency": 1,
      "driver": "example",
      "rate_limit": 2,
      "parameters": {
        "index_pattern": "logstash*"
      },
      "operations": [
        {
          "name": "ping",
          "weight": 1
        },
        {
          "name": "count",
          "weight": 2,
          "sla": 200
        },
        {
          "name": "count",
          "weight": 1,
          "sla": 200,
          "parameters": {
            "index_pattern": "rankin*"
          }
        },
        {
          "name": "cluster_health",
          "weight": 1
        }
      ]
    }
  ]
}
```

# Anatomy of a driver

The structure of a driver is best understood by reviewing the [example driver](./index.js). The various part of the driver are described below.

## The init() function

The init function is passed parameters and an instance of a Elasticsearch client. It is responsible for
initiating the state object, which will be passed into every operation initiated by this worker. This
makes it possible to carry state between operations initiated by a single worker. There is however no 
method available to synchronize multiple workers.

This function is expected to be synchronous as it needs to be completed before the worker starts processing operations.

```
module.exports.init = function(esClient, parameters) {
	var state = {};

  set_state_value('index_pattern', state, parameters, '*');

	return state;
}

function set_state_value(name, state, parameters, default_value) {
  if (parameters && parameters[name]) {
    state[name] = parameters[name];
  } else {
    state[name] = default_value;
  }
}
```

## Functions implementing operations

All functions that represent operations take 4 parameters.

1. An instance of an Elasticsearch client

2. The state object that was initiated by the **init()** function.

3. An object containing any parameters that were specified at the operation level in the config file. If no parameters were specified, an empty object will be passed.

4. A callback function used to return the results to the worker once the operation has completed. 

This operation looks at parameters passed at different levels and determines which index pattern to use for the operation.

When the operation has completed, the callback function is passed a results object. In this it is mandatory to set **result_code** to a string, but any other fields are flexible and optional.

```
module.exports.count = function(esClient, state, operation_parameters, result_callback) {
  var index_pattern = state['index_pattern'];

  if(operation_parameters.index_pattern) {
    index_pattern = operation_parameters.index_pattern;
  }

  esClient.count({
    index: index_pattern,
    requestTimeout: 30000
  }, function (error, response) {
    if (error) {
      result_callback( { 'result_code': 'ERROR', 'index_pattern': index_pattern } );
    }

    result_callback( { 'result_code': 'OK', 'count': response.count, 'index_pattern': index_pattern } );
  });
}
```

The operation below illustrates that it is possible to just reurn a simple result string instead of a complete object.


```
module.exports.ping = function(esClient, state, operation_parameters, result_callback) {
  esClient.ping({
    requestTimeout: 30000
  }, function (error, response) {
    if (error) {
      result_callback('ERROR');
    }

    result_callback('OK');
  });
}
```







	







	















