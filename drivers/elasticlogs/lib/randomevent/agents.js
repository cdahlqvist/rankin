var WeightedArray = require('./weighted_array');
var agents_data = require('./agents_data');

var agents = new WeightedArray(agents_data.agents);

module.exports.add_to_event = function (evt) {
  var data = agents.get();
  evt['agent'] = data[0];
  evt['useragent'] = {};
  evt['useragent']['os'] = agents_data.os_lookup[data[1]];
  evt['useragent']['os_name'] = agents_data.os_name_lookup[data[2]];
  evt['useragent']['name'] = agents_data.name_lookup[data[3]];

  return;
};
