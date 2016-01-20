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
**--interval** | **-i**  | Reporting interval for summary statistics in seconds. Setting this to 0 will cause statistics to only be reported at the end of the run. **[default: 60]**
**--duration** | **-d**  | Duration of the run in minutes. **[default: 1]**
**--agents** | **-a**  | Number of agents to run. Must be a positive integer. **[default: 1]**
**--creds** | **-c**  | user:password credentials when you want to connect to a secured elasticsearch cluster over basic auth.
**--hosts** | **-h**  | List of host name and port combinations to connect to, e.g. host1:9200,host2:9200 **[default: "localhost:9200"]**
**--protocol** | **-p**  | Protocol to use (http/https) when connecting to Elasticsearch. **[default: "http"]**
**--directory** | **-D**  | Directory which to write results and statistics to. **[default: "."]**
**--help** || Show the help message

When run, Rankin will output logging information to *stdout*. Results from individual requests as well as summary statistics are written to a results file specific to the run in JSON format in the specified data directory.

## Configuration files
Rankin is, in addition to the command-line configuration parameters described above, driven by configuration files specifying jobs as well as runtime parameters to be recorded. One or more configuration files can be specified for each run and typically look as follows:

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
      "cycle_operations": false,
      "parameters": {
        "index_pattern": "logstash*"
      },
      "operations": [
        {
          "name": "ping",
          "weight": 1
        },
        {
          "label":"count-default"
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

Each file can contain a JSON object specifying a list of runtime parameters and/or a list of jobs. 

Runtime parameters will be copied into every result record reported and can be used for grouping data during the analysis phase. Anything specified under 'run' will be merged from the supplied configuration files. The order the merge is performed in is not guaranteed.

The 'jobs' field contains a list of job specifications. Each job specification provide details for a single job and can contain the following fields:

Field | Mandatory | Description
:------------ | :------------- | :------------
job_id | Yes | This is the ID of the job and will show up when statistics are reported. Multuple configuration files exectuted at the same time can have the same job_id.
concurrency | No | The number of concurrent connections/workers that should be used for this job. If not specified this will default to 1.
driver | Yes | Which driver to use for this job. This defined which operations and parameters that are supported.
rate_limit | No | This is an upper limit for the number of requests per second the job will aim to generate against the cluster. If not specified this will default to generate as many requests as possible.
cycle_operations | No | Parameter indicating whether all operations should be cycled through in sequence or be randomly triggered. This parameter defaults to *false* resulting in operations being selected randomly according to weight.
parameters | No | Parameters to be sent through to the driver during the initiation phase. Can be used to customise the driver's behaviour.
operations | No | List of the operations to run for the job. If no operations at all are specified, all operations supported by the driver will be run with equal probability of selection. The structure op an operation is described in the table below.

Each operation in the list can contsin the following parameters:

Field | Mandatory | Description
:------------ | :------------- | :------------
name | Yes | Name of the operation. Must be defined by the driver.
label | No | Label to be used for grouping of results. Defaults to operation name if not provided.
weight | No | The relative number of operations of this type that willbe performed. Must be an integer greater than 0. If no weight is specified, it defaults to 1 for the operation. 
sla | No | Defines the upper SLA limit in milliseconds for the operation. If this is defined, every operation that exceeds this threshold will be flagged. If no sla is specified, no sla will be tracked.
parameters | No | This field can contsin a set of parameters that will be passed in to the operation for every execution.

## Extending Rankin
Rankin comes with a selection of example drivers that can be used as templates when createing custom drivers. These are typically located in the *drivers* directory. 

Created custom drivers can be stored there as well, but Rankin will fall back on loading installed modules if a driver is not found in that directory.

Each driver should have an **init** function, which takes the configuration parameters and created a **state** object that will be passed into each operation.

It will then also implement one or more **operations** which takes an Elasticsearch client, the created state as well as a callback for reporting the result of the operation as arguments.

A more detailed description of how a driver is constructed can be found [in the documentation for the example driver](./drivers/example/README.md).


