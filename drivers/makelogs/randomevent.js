var _ = require('lodash');
var samples = require('./samples');

var dayMs = 86400000;

module.exports.RandomEvent = function(state) {
  var event = {};
  var dateAsIso;

  if(!state.days) {
    dateAsIso = new Date().toISOString();
  } else {
    dateAsIso = new Date(_.random(state.days.start, state.days.end)).toISOString();
  }

  if (state.time_index) {
    event.index = state.index_prefix +
      dateAsIso.substr(0, 4) + '.' + dateAsIso.substr(5, 2) + '.' + dateAsIso.substr(8, 2);
  } else {
    event.index = state.index_prefix;
  }

  event['@timestamp'] = dateAsIso;
  event.ip = samples.ips();
  event.extension = samples.extensions();
  event.response = samples.responseCodes();

  event.geo = {
    coordinates: samples.airports(),
    src: samples.countries(),
    dest: samples.countries()
  };
  event.geo.srcdest = event.geo.src + ':' + event.geo.dest;

  event['@tags'] = [
    samples.tags(),
    samples.tags2()
  ];
  event.referer = 'http://' + samples.referrers() + '/' + samples.tags() + '/' + samples.astronauts();
  event.agent = samples.userAgents();
  event.bytes = event.response < 500 ? samples.lessRandomRespSize(event.extension) : 0;

  switch (event.extension) {
  case 'php':
    event.host = 'theacademyofperformingartsandscience.org';
    event.request = '/people/type:astronauts/name:' + samples.astronauts() + '/profile';
    event.phpmemory = event.memory = event.bytes * 40;
    break;
  case 'gif':
    event.host = 'motion-media.theacademyofperformingartsandscience.org';
    event.request = '/canhaz/' + samples.astronauts() + '.' + event.extension;
    break;
  case 'css':
    event.host = 'cdn.theacademyofperformingartsandscience.org';
    event.request = '/styles/' + samples.stylesheets();
    break;
  default:
    event.host = 'media-for-the-masses.theacademyofperformingartsandscience.org';
    event.request = '/uploads/' + samples.astronauts() + '.' + event.extension;
    break;
  }

  event.url = 'https://' + event.host + event.request;

  var i, key, value, text;
  var str_fields = [];
  var int_fields = [];

  for(i = 0; i < state.int_fields; i++) {
    key = 'intfield' + i;
    var limit_index = i % state.int_limits.length;
    var value = _.random(0, state.int_limits[limit_index] - 1);
    event[key] = value;
    int_fields.push(value);
  }

  for(i = 0; i < state.str_fields; i++) {
    key = 'strfield' + i;
    var str_index = i % state.str_files.length;
    var str_array = state.str_files[str_index];
    var array_index = _.random(0, str_array.length - 1);
    value = str_array[array_index];
    event[key] = value;
    str_fields.push(value);
  }

  if (state.text_lines) {
    text = ' ';
    for (i = 0; i < state.text_multiplier; i++) {
      var index = _.random(0, state.text_lines.length - 1);
      value = state.text_lines[index];
      text = text + value;
    }

    event.txt = text;
  } else {
    text = '';
  }

  event['@message'] = event.ip + ' - - [' + dateAsIso + '] "GET ' + event.request + ' HTTP/1.1" ' +
      event.response + ' ' + event.bytes + ' "-" "' + event.agent + '" "' + str_fields.join('" "') +
      '" ' + int_fields.join(' ') + text;

  event.spaces = 'this   is   a   thing    with lots of     spaces       wwwwoooooo';
  event.xss = '<script>console.log("xss")</script>';
  event.headings = [
    '<h3>' + samples.astronauts() + '</h5>',
    'http://' + samples.referrers() + '/' + samples.tags() + '/' + samples.astronauts()
  ];
  event.links = [
    samples.astronauts() + '@' + samples.referrers(),
    'http://' + samples.referrers() + '/' + samples.tags2() + '/' + samples.astronauts(),
    'www.' + samples.referrers()
  ];

  event.relatedContent = samples.relatedContent();

  event.machine = {
    os: samples.randomOs(),
    ram: samples.randomRam()
  };

  return event;
};
