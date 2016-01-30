# Driver: jsonevents
This driver supports generating events for bulk indexing based on a JSON template.

## Operations
The driver supports the following operation:

### index
This operation performs bulk index operations of data generated based on the parameters defined below.

## Parameters
The following parameters can be used to configure the data generation process of the makelogs driver:

Parameter | Description
:------------ | :------------
**batch_size** | Batch size for bulk index requests. Default value is *1000*.
**days** | Date or date interval events should be generated in. This can be specified in 3 formats: 1) Absolute single date, e.g. *"2015-04-20"* 2) Absolute date range, e.g. *"2015-04-20,2015-04-26"* 3) Date range relative to current date/time, e.g. *"-7,3"*. If not specified, all events will be generated based on the current date/time.
**index_prefix** | Prefix for the index name. This will be used as full index name if time based indices are not used. Defaults to *"rankin-"*.
**time_index** | Boolean parameter indicating whether time based indices are to be used. Defaults to *true*.

**event_template_file** | Path to a file containing the JSON event template to use for record generation. If not provided, an empty event will be used as template.
**value_definitions** | This parameter contains a list of named values that can be associated with fields in the template. Four types of values are supported: integers, floats, strings from a text file and JSON objects from a file containing a list of JSON objects. The example configuration file shows how these can be specified.
**field_value_map** | This parameter contains a map of fields and which values they are to be replaced with when generating the event. A random value for the field will be picked from the value it is accociated with. If the field already exists it will be overwritten. If the value it is mapped to does not exist, it will simply be skipped. This parameter can be passed as an operation parameter.

## Example Configuration File
Below is a sample configuration file that shows how the driver can be invoked. 

This example aim to generate an average of 1 bulk **index** request per second with 1000 records each, giving an average indexing rate of 1000 events/second across 2 workers.

Each event is generated based on a JSON template and 4 fields are modified randomly for each event.

```
{
  "jobs" : [
    {
      "job_id": "jsonevents",
      "concurrency": 2,
      "driver": "jsonevents",
      "rate_limit": 1,
      "cycle_operations": true,
      "parameters": {
        "batch_size":1000,
        "days":"2016-01-01,2016-01-31" ,           
        "index_prefix":"jsonevents",  
        "time_index":false,
        "event_template_file" : "./drivers/jsonevents/example_data/event_template.json",
        "value_definitions": [
          {
            "name":"i",
            "type":"integer",
            "min_integer":10000,
            "max_integer":20000
          },
          {
            "name":"f",
            "type":"float",
            "min_float":100.0,
            "max_float":200.0
          },
          {
            "name":"j",
            "type":"json_file",
            "file":"./drivers/jsonevents/example_data/json_file.json"
          },
          {
            "name":"t",
            "type":"text_file",
            "file":"./drivers/jsonevents/example_data/text_file.txt"
          }
        ],
        "field_value_map": {
            "field4": "i",
            "field10": "f",
            "field1": "t",
            "field14": "j"
        },
        "timeout":10000
      },
      "operations": [
        {
          "label": "index_override",
          "name": "index",
          "weight": 1,
          "parameters": {
            "field_value_map": {
              "field5": "i",
              "field20": "f",
              "field2": "t",
              "field15": "j"
            }
          }
        },
        {
          "label": "index_default",
          "name": "index",
          "weight": 1
        }
      ]
    }
  ]
}
```
