
function Histogram() {
  this.stats = {};
}

Histogram.prototype.store_latency = function(latency, sla_breach) {
  if (typeof sla_breach !== 'boolean') {
    sla_breach = false;
  }

  if (latency in this.stats) {
    if(sla_breach) {
      this.stats[latency].count++;
      this.stats[latency].sla++;
    } else {
      this.stats[latency].count++;
    }
  } else {
    if(sla_breach) {
      this.stats[latency] = { val: latency, count: 1, sla: 1};
    } else {
      this.stats[latency] = { val: latency, count: 1, sla: 0};
    }
  }
};

Histogram.prototype.get_statistics = function() {
  var min, max, mean;
  var count = 0;
  var total = 0.0;
  var sla_total = 0;
  var key;

  for (key in this.stats) {
    var l = this.stats[key];

    if(min === undefined || l.val < min) {
      min = l.val;
    }

    if(max === undefined || l.val > max) {
      max = l.val;
    }

    sla_total = sla_total + l.sla;
    count += l.count;
    total += (l.count * l.val);
  }

  if (count > 0) {
    mean = total / count;
  } else {
    min = max = mean = 0;
  }

  var std_dev_acc = 0;
  var std_dev = 0;

  for (key in this.stats) {
    var delta = this.stats[key].val - mean;
    std_dev_acc = std_dev_acc + Math.pow(delta, 2);
  }

  if (count > 0) {
    std_dev = Math.sqrt(std_dev_acc / count);
  }

  this.stats = {};

  return { min: min, max: max, count: count, mean: mean, sla_breaches: sla_total, std_dev: std_dev };
};

module.exports.Histogram = Histogram;
