# Driver: makelogs
This driver is a modified version of Spencer Alger's [makelogs](https://github.com/spalger/makelogs) data generator.

## Operations
The driver supports the following 2 operations:

### index
This operation performs bulk index operations of data generated based on the parameters defined below.

### generate
This operation generated batches of data based on the parameters defined below, but either drops it or writes it to a file instead of inserting it into Elasticsearch. This can be used to generate raw JSON data or to test how long the data generation process takes.

## Parameters
The following parameters can be used to configure the data generation process of the makelogs driver:

Parameter | Description
:------------ | :------------
**batch_size** | Batch size for bulk index requests. Default value is *1000*.
**days** | Date or date interval events should be generated in. This can be specified in 3 formats: 1) Absolute single date, e.g. *"2015-04-20"* 2) Absolute date range, e.g. *"2015-04-20,2015-04-26"* 3) Date range relative to current date/time, e.g. *"-7,3"*. If not specified, all events will be generated based on the current date/time.
**index_prefix** | Prefix for the index name. This will be used as full index name if time based indices are not used. Defaults to *"rankin-"*.
**time_index** | Boolean parameter indicating whether time based indices are to be used. Defaults to *true*.
**delete_fields** | List of base level event fields to be deleted before the event is passed on for indexing. This allows customisation of the generated output. By default no fields are deleted.
**text_file** | Path to a text file used to add unstructured text at the end of the event and in a field called *text*. A random line will be added to each event generated. If no file specified nu unstructured data will be added to the event.
**text_multiplier** | If a text file is configured, this parameter determines how many random text lines from the file that will be concatenated to form the text field. Defaults to 1.
**int_fields** | Integer specifying the number of integer fields named *intfield<N>* to be generated for the event.
**int_limits** | Array containing the maximum integer value the generated integer fields should have. If fewer limits than fields are specified, limits will be assigned based on modulo calculation. If no limit is specified, a max value of 10000000 will be used.
**str_fields** | Integer specifying the number of string fields named *strfield<N>* to be generated for the event.
**str_files** | List of paths to files used to generate data for the string fields. For each field a random line in the file will be selected. If the number of files is lower than the number of fields, files will be selected based on modulo calculation. If no files are specified, string field generation will be disabled.
**json_output_file** | Path to the file the *generate* operation should output JSON events to. If not specified, the *generate* operation will simply drop all generated events.
**text_output_file** | Path to the file the *generate* operation should output the raw text events (the @message field in the event) to. If not specified, the *generate* operation will simply drop all generated events.


## Example Configuration File
Below is a sample configuration file that shows how the driver can be invoked. 

This example aim to generate an average of 14 bulk **index** requests per second with 500 records each, giving an average indexing rate of 7000 events/second across 10 workers. It also generates an average of one **generate** operation per second in order to track how long the data generation takes.

Each generated event has some standard fields removed and a text field and 2 string fields and 2 integer fields added. Both string fields will be populated based on the same list.

```
{
  "jobs": [
    {
      "job_id": "job2",
      "concurrency": 10,
      "driver": "makelogs",
      "rate_limit": 15,
      "parameters": {
        "batch_size": 500,
        "days": "2015-01-01,2015-01-05",
        "delete_fields": ["spaces","xss","relatedContent","headings","links"],
        "text_file": "./loglines.txt",
        "int_fields": 2,
        "int_limits": [20, 5000000],
        "str_fields": 2,
        "str_files": ["./strings.txt"]
      },
      "operations": [
        {
          "name": "index",
          "weight": 14,
          "sla": 1000
        },
        {
          "name": "generate",
          "weight": 1
        }
      ]
    }
  ]
}
```
