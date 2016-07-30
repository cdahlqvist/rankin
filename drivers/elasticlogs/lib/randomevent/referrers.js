var WeightedArray = require('./weighted_array');
var referrers_data = require('./referrers_data');

var referrers = new WeightedArray(referrers_data.referrers);

module.exports.add_to_event = function (evt) {
  var data = referrers.get();
  evt['referrer'] = referrers_data.url_base_lookup[data[0]] + data[1];

  return;
};
