var agents = require('./agents');
var clientips = require('./clientips');
var referrers = require('./referrers');
var requests = require('./requests');
var Stochator = require('../../../makelogs/samples/stochator');
var roundAllGets = require('../../../makelogs/samples/round_all_gets');

var _ = require('lodash');

var dayMs = 86400000;
var period = 20000000;

function randomMsInDayRange(startms, endms) {
  return _.random(startms, endms);
};

function lessRandomMsInDay() {
  return roundAllGets(new Stochator({
    min: 0,
    max: dayMs,
    mean: dayMs / 2,
    stdev: dayMs * 0.15,
  }, 'get'));
}

module.exports.RandomEvent = function(state, driver_data) {
  var event = {};
  var dateAsIso;

  if(!state.days) {
    dateAsIso = new Date().toISOString();
  } else {
    // random date in interval
    var date = new Date(randomMsInDayRange(state.days.start, state.days.end));
    dateAsIso = date.toISOString();
  }

  if (state.time_index) {
    event.index = state.index_prefix +
      dateAsIso.substr(0, 4) + '.' + dateAsIso.substr(5, 2) + '.' + dateAsIso.substr(8, 2);
  } else {
    event.index = state.index_prefix;
  }

  event['@timestamp'] = dateAsIso;

  agents.add_to_event(event);
  clientips.add_to_event(event);
  referrers.add_to_event(event);
  requests.add_to_event(event);

  event['@message'] = event.clientip + ' - - [' + dateAsIso + '] "' + event.verb + ' ' + event.request + ' HTTP/' + event.httpversion + '" ' +
      event.response + ' ' + event.bytes + ' "-" "' + event.agent + '"';

  return event;
};



