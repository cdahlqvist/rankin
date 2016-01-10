# Driver: example
This simple driver has been created as an example of how a driver can be designed, and should be possible to use as a template for more complex drivers.

## Operations
The driver supports the following 3 operations:

### count
This operation will count all records in indices matching the configuration parameter **index_pattern**, which defaults to '\*'. If the parameter **log_count** is set to *true*, a log entry will be generated per worker every time the count changes. The  **log_count** parameter defaults to *false*.

### ping
Performs a simple ping against the Elasticsearch cluster.

### cluster_health
This operation will check the cluster status (*green*, *yellow* or *red*) and if the parameter **log_health** is set to *true*, a log entry will be generated per worker every time the result changes.

## Example Configuration File
Below is a sample configuration file that shows how the driver can be invoked. In this example a single worker will be used to generate 2 requests per second. The mix of operations will be 25% **ping**, 25% **cluster_health** and 50% **count** operations. All count operations taking longer than 200 ms will be counted as having breached the SLA.

```
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
      "name": "cluster_health",
      "weight": 1
    }
  ]
}
```









	















