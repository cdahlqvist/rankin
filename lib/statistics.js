
var histogram = require('./histogram');

function Statistics() {
  this.stats = {};
  this.timestamp = (new Date).getTime();
}

Statistics.prototype.store_statistic = function(job, label, result, latency, sla_breach) {
  sla_breach = typeof sla_breach === 'boolean' ? sla_breach : false;

  if(this.stats[job]) {
    if (this.stats[job][label]) {
      if (!this.stats[job][label][result]) {
        this.stats[job][label][result] = new histogram.Histogram();
      }
    } else {
      this.stats[job][label] = {};
      this.stats[job][label][result] = new histogram.Histogram();
    }
  } else {
    this.stats[job] = {};
    this.stats[job][label] = {};
    this.stats[job][label][result] = new histogram.Histogram();
  }

  this.stats[job][label][result].store_latency(latency, sla_breach);   
};

Statistics.prototype.get_statistics = function() {
  var statistics = this.stats;
  this.stats = {};

  var current_timestamp = (new Date).getTime();
  var period = (current_timestamp - this.timestamp) / 1000;
  this.timestamp = current_timestamp;

  var display_statistics = [];

  for (var job in statistics) {
    for (var label in statistics[job]) {
      for (var result in statistics[job][label]) {
        var stats = statistics[job][label][result].get_statistics();
        stats.period = period;
        stats.tps = stats.count / period;
        stats.job = job;
        stats.label = label;
        stats.result = result;

        display_statistics.push(stats);
      }
    }
  }

  return display_statistics;
};

module.exports.Statistics = Statistics;
