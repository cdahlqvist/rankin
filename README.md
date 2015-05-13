# Rankin - a load generator for Elasticsearch
Simple load generator used to generate load against an Elasticsearch cluster. It is designed to be easy to use and extend so that it can be adapted to simulate various indexing and query loads. 

The name Rankin comes from the Marvel character Calvin Rankin, aka [Mimic](http://marvel.com/universe/Mimic_\(Calvin_Rankin\)), who has the ability to mimic the powers of those around him, much the same way this little utility can be used to mimic various systems and applications interacting with Elasticsearch.

## Installation

```
npm install -g rankin
```

## Execution

```
rankin [options]
```

Rankin takes the following command line parameters:

Long option | Short option | Description
:------------ | :------------- | :------------
**--file** | **-f**  | Path to test configuration file(s). **[Mandatory]**
**--interval** | **-i**  | Reporting interval for statistics in seconds. Setting this to 0 will cause statistics to only be reported at the end of the run. **[default: 10]**
**--duration** | **-d**  | Duration of the run in minutes. **[default: 1]**
**--agents** | **-a**  | Number of agents to run. Must be a positive integer. **[default: 1]**
**--creds** | **-c**  | user:password credentials when you want to connect to a secured elasticsearch cluster over basic auth.
**--hosts** | **-h**  | List of host name and port combinations to connect to, e.g. host1:9200,host2:9200 **[default: "localhost:9200"]**
**--protocol** | **-p**  | Protocol to use (http/https) when connecting to Elasticsearch. **[default: "http"]**
**--help** || Show the help message

When run, Rankin will output logging information as well as statistics to *stdout*. The statistics look like the example lines below:

```
2015-05-13T17:53:54.594Z STATS job=job1, operation=ping, result=OK, period=10.006, count=19, tps=1.899, sla_breaches=0, min=2, max=35, mean=6.316, std_dev=6.726
2015-05-13T17:53:54.594Z STATS job=job1, operation=cluster_health, result=OK, period=10.006, count=18, tps=1.799, sla_breaches=0, min=2, max=20, mean=5.889, std_dev=4.786
2015-05-13T17:53:54.594Z STATS job=job1, operation=count, result=OK, period=10.006, count=13, tps=1.299, sla_breaches=0, min=155, max=240, mean=189.385, std_dev=25.220
```

## Configuration files
Rankin is, in addition to the command-line configuration parameters described above, driven by configuration files specifying jobs. One or more configuration files can be specified for each run and typically look as follows:

```
{
  "job_id": "job1",
  "concurrency": 1,
  "driver": "example",
  "rate_limit": 2,
  "parameters": {
    "log_count": false,
    "log_health": true,
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
Each configuration file specifies a single job and can contsin the following fields:

Field | Mandatory | Description
:------------ | :------------- | :------------
job_id | Yes | This is the ID of the job and will show up when statistics are reported. Multuple configuration files exectuted at the same time can have the same job_id.
concurrency | No | The number of concurrent connections/workers that should be used for this job. If not specified this will default to 1.
driver | Yes | Which driver to use for this job. This defined which operations and parameters that are supported.
rate_limit | No | This is an upper limit for the number of requests per second the job will aim to generate against the cluster. If not specified this will default to generate as many requests as possible.
parameters | No | Parameters to be sent through to the driver during the initiation phase. Can be used to customise the driver's behaviour.
operations | No | List of the operations to run for the job. Each operation must be specified by name. If no weight is specified, it defaults to 1 for the operation. If no sla (given in ms) is specified, no sla will be tracked. If no operations at all are specified, all operations supported by the driver will be run with equal probability of selection.

## Extending Rankin
Rankin comes with a selection of example drivers that can be used as templates when createing custom drivers. These are typically located in the *drivers* directory. 

Created custom drivers can be stored there as well, but Rankin will fall back on loading installed modules if a driver is not found in that directory.

Each driver should have an **init** function, which takes the configuration parameters and created a **state** object that will be passed into each operation.

It will then also implement one or more **operations** which takes an Elasticsearch client, the created state as well as a callback for reporting the result of the operation as arguments.


