var WeightedArray = require('./weighted_array');
var requests_data = require('./requests_data');

var requests = new WeightedArray(requests_data.requests);

module.exports.add_to_event = function (evt) {
  var data = requests.get();

  evt['request'] = requests_data.url_base_lookup[data[0]] + data[1];
  evt['bytes'] = data[2];
  evt['verb'] = data[3];
  evt['response'] = data[4];
  evt['httpversion'] = data[5];

  return;
};