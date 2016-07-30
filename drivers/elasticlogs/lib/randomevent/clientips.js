var _ = require('lodash');
var WeightedArray = require('./weighted_array');
var clientips_data = require('./clientips_data');

var clientips = new WeightedArray(clientips_data.clientips);
var rare_clientips = new WeightedArray(clientips_data.rare_clientips);

module.exports.add_to_event = function (evt) {
  var rnd = _.random();
  var data;

  evt['geoip'] = {};

  if(rnd < clientips_data.rare_clientip_probability) {
    data = rare_clientips.get();
    evt['clientip'] = fill_out_ip_prefix(data[0]);
  } else {
    data = clientips.get();
    evt = data[0];
  }

  evt['geoip']['country_name'] = clientips_data.country_lookup[data[1]];
  evt['geoip']['location'] = clientips_data.location_lookup[data[2]];

  return;
};

function fill_out_ip_prefix(ip) {
  var rnd1 = _.random(0, 1, true);
  var v1 = rnd1 * (1 - rnd1) * 255 * 4;
  var k1 = Math.round(v1);
  var rnd2 = _.random(0, 1, true);
  var v2 = rnd2 * (1 - rnd2) * 255 * 4;
  var k2 = Math.round(v2);
    
  return ip + "." + k1 + "." + k2;
}
