var util = require("./util");
var optimist = require('optimist')
  .usage('A utility to generate load for Elasticsearch clusters.\n\nUsage: $0 [options]')
  .options({
    file: {
      alias: 'f',
      describe: 'Path to test configuration file(s). [Mandatory]',
      required: true
    },
    interval: {
      alias: 'i',
      describe: 'Reporting interval for statistics in seconds. Setting this to 0 will cause statistics to only be reported at the end of the run.',
      type: 'number',
      default: 10
    },
    duration: {
      alias: 'd',
      describe: 'Duration of the run in minutes.',
      type: 'number',
      default: 1
    },
    agents: {
      alias: 'a',
      describe: 'Number of agents to run. Must be a positive integer.',
      type: 'number',
      default: 1
    },
    creds: {
      alias: 'c',
      describe: 'user:password credentials when you want to connect to a secured elasticsearch cluster over basic auth.'
    },
    hosts: {
      alias: 'h',
      describe: 'List of host name and port combinations to connect to, e.g. host1:9200,host2:9200',
      default: 'localhost:9200'
    },
    protocol: {
      alias: 'p',
      describe: 'Protocol to use when connecting to Elasticsearch. [http/https]',
      default: 'http'
    },
    directory: {
      alias: 'D',
      describe: 'Directory which to write results and statistics to. ["."]',
      default: '.'
    },
    run_id: {
      alias: 'r',
      describe: 'Run id used to link results together. This defaults to an autognerated value based on current timestamp.'
    },
    help: {
      describe: 'This help message',
      type: 'boolean'
    }
  });

var argv = optimist.argv;

if (argv.help) {
  show_help();
}

// validate protocol
if (['http','https'].indexOf(argv.protocol) <= -1) {
  console.log('Error: Illegal protocol specified (%s).', argv.protocol);
  show_help();
} 

// Verify file has been specified
if (!argv.file) {
  console.log('Error: No configuration file(s) specified.');
  show_help();
}

// Verify at least 1 agent specified
if (argv.agents < 0) {
  console.log('Error: No agents specified.');
  show_help();
}

// Create list of host strings
if(argv.creds) {
  argv.hosts = argv.hosts.split(',').map(function urlify(host) { return argv.protocol + '://' + argv.creds + '@' + host; });
} else {
  argv.hosts = argv.hosts.split(',').map(function urlify(host) { return argv.protocol + '://' + host; });
}

// Create configuration file list
if (typeof(argv.file) === 'string') {
  argv.f = argv.file = argv.file.split(',');
}

// Ensure run id assigned
if (!argv.run_id) {
  argv.run_id = util.get_run_id();
}

module.exports = argv;


function show_help() {
  optimist.showHelp(console.log);
  process.exit();
}
