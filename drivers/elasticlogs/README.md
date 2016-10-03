# Driver: makelogs
This driver is a modified version of Spencer Alger's [makelogs](https://github.com/spalger/makelogs) data generator. It generates wec access log events based on statistics from anonymized logs from the www.elastic.co website. By default, it generates events in the following format:

```
{
  "@message": "78.42.250.29 - - [2016-01-29T16:41:38.416Z] \"GET /favicon-32x32.png HTTP/1.1\" 200 2251 \"-\" \"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_3) AppleWebKit/601.4.4 (KHTML, like Gecko) Version/9.0.3 Safari/601.4.4\"",
  "bytes": 2251,
  "httpversion": "1.1",
  "verb": "GET",
  "index": "rankin-2016.01.29",
  "agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_3) AppleWebKit/601.4.4 (KHTML, like Gecko) Version/9.0.3 Safari/601.4.4",
  "clientip": "78.42.250.29",
  "geoip": {
    "location": [8.25, 48.75],
    "country_name": "Germany"
  },
  "@timestamp": "2016-01-29T16:41:38.416Z",
  "referrer": "https://www.elastic.co/guide/en/elasticsearch/guide/current/highlighting-intro.html",
  "useragent": {
    "os": "Mac OS X 10.11.3",
    "name": "Safari",
    "os_name": "Mac OS X"
  },
  "response": 200,
  "request": "/favicon-32x32.png"
}
```

Example mappings for Elasticsearch version 2.x and 5.0 are available in the *mapping_templates* directory and should be installed before running any benchmark.

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
**index_prefix** | Prefix for the index name. This will be used as full index name if time based indices are not used. Defaults to *"rankin_elasticlogs"*.
**time_index** | Boolean parameter indicating whether time based indices are to be used. Defaults to *true*.
**delete_fields** | List of base level event fields to be deleted before the event is passed on for indexing. This allows customisation of the generated output. By default no fields are deleted.

## Example Configuration File
Below is a sample configuration file that shows how the driver can be invoked. 

This example aim to generate an average of 15 bulk **index** requests per second with 1000 records each, giving an average indexing rate of 15000 events/second across 10 workers.

```
{
  "jobs": [
    {
      "job_id": "job2",
      "concurrency": 10,
      "driver": "elasticlogs",
      "rate_limit": 15,
      "parameters": {
        "batch_size": 1000,
        "days": "2015-01-01,2015-01-05"
      },
      "operations": [
        {
          "name": "index",
          "weight": 1,
          "sla": 1000
        }
      ]
    }
  ]
}
```
