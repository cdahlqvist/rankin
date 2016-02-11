# Driver: example
This simple driver has been created as an example of how a driver can be designed, and should be possible to use as a template for more complex drivers. It implements a set of general cluster and index level operations, which can be useful when monitoring clusters during benchmarking.

## Operations
This driver supports the following 3 Elasticsearch operations:

### count
This operation will count all records in indices matching the configuration parameter **index_pattern**, which defaults to '\*'. The returned count will be passed back as part of the results object.

It is also possible to specify the **index_pattern** in the parameters passed to each individual operation.

### ping
Performs a simple ping against the Elasticsearch cluster.

### cluster_health
This operation will check the cluster status (*green*, *yellow* or *red*) and will return this as part of the result.

### cluster_stats
This operation will retrieve the cluster stats and return this as part of the result.

### index_size
This operation determines the total primary and total size of all indices that make up an index pattern.

## Example Configuration File
Below is a sample configuration file that shows how the driver can be invoked. In this example a single worker will be used to generate 2 requests per second. The mix of operations will be 1/6 **ping**, 1/6 **cluster_health**, 1/6 **cluster_stats**, 1/6 **index_size** and 1/3 **count** operations for two different index patterns. All count operations taking longer than 200 ms will be counted as having breached the SLA.

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
          "label": "count-1",
          "name": "count",
          "weight": 1,
          "sla": 200
        },
        {
          "label": "count-2",
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
        },
        {
          "name": "index_size",
          "weight": 1,
          "parameters": {
            "index_pattern": "*"
          }
        },
        {
          "name": "cluster_stats",
          "weight": 1
        }
      ]
    }
  ]
}
```

## Generated results
Rankin generates two types of results, summary and detail records. These are in JSON format where each line contains a single JSON object.

The structure of a summary record, which summarises all operations related to a specific job, driver and label is as follows when pretty printed:

```
{
	"run": {
		"run_id": "20160120_111021_621",
		"cluster": "test_cluster"
	},
	"timestamp": "2016-01-20T11:11:21.670Z",
	"record_type": "summary",
	"job_id": "job1",
	"label": "count-1",
	"result": {
		"result_code": "OK"
	},
	"period": 60.02,
	"count": 74,
	"tps": 1.2329223592135954,
	"sla_breaches": 0,
	"latency_min": 2,
	"latency_max": 9,
	"latency_avg": 3.5405405405405403,
	"latency_stddev": 0.7950873781901073
}
```

Detail records are generated for each operation that completes and have the following structure, although the exact details can vary depending on the configuration:

```
{
	"timestamp": "2016-01-20T11:10:24.132Z",
	"job_id": "job1",
	"driver": "example",
	"record_type": "detail",
	"operation": "count",
	"label": "count-2",
	"parameters": {
		"index_pattern": "logstash*"
	},
	"result": {
		"result_code": "OK",
		"count": 0
	},
	"latency": 4,
	"sla_breach": false,
	"run": {
		"run_id": "20160120_111021_621",
		"cluster": "test_cluster"
	}
}
```

## Anatomy of a driver

The structure of a driver is best understood by reviewing the [example driver](./index.js). The various part of the driver are described below.

### The init() function

The init function is passed an instance of a Elasticsearch client, parameters and an object that can be used to hold data shared between all tasks for a specific driver. It is responsible for initiating the state object, which will be passed into every operation initiated by this worker. This
makes it possible to carry state between operations initiated by a single worker. There is however no method available to synchronize multiple workers.

It should also store any sharded data in the *driver_data* object.

This function is expected to be synchronous as it needs to be completed before the worker starts processing operations.

```
module.exports.init = function(esClient, parameters, driver_data) {
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

### Functions implementing operations

All functions that represent operations take 5 parameters.

1. An instance of an Elasticsearch client

2. The state object that was initiated by the *init()* function.

3. An *driver_data* object holding references to shared data for this particular driver initiated by the *init()* function.

4. An object containing any parameters that were specified at the operation level in the config file. If no parameters were specified, an empty object will be passed.

5. A callback function used to return the results to the worker once the operation has completed. 

This operation looks at parameters passed at different levels and determines which index pattern to use for the operation.

When the operation has completed, the callback function is passed a results object. In this it is mandatory to set **result_code** to a string, but any other fields are flexible and optional.

```
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
      result_callback( { 'result_code': 'ERROR', 'index_pattern': index_pattern } );
    }

    result_callback( { 'result_code': 'OK', 'count': response.count, 'index_pattern': index_pattern } );
  });
}
```

The operation below illustrates that it is possible to just return a simple result string instead of a complete object.


```
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
```







	







	















