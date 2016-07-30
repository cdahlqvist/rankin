/**
 * @class WeightedArray
 * @constructor
 */

module.exports = WeightedArray;

var _ = require('lodash');
var inherits = require('util').inherits;

function WeightedArray(list) {
  Array.call(this);

  _.forEach(list, _.bindKey(this, 'push'));

}
inherits(WeightedArray, Array);

/**
 * Add a value to the weighted list.
 * @method add
 * @param {Any} value
 * @param {Number} [weight] Optional.  Defaults to 1.
 * @return {Number} The index of the item that was added.
 */
WeightedArray.prototype.push = function (item) {
  var weight = item[0];
  var value = item[1];

  if (!weight && weight !== 0) {
    weight = 1;
  }

  Array.prototype.push.call(this, {
    value: value,
    weight: weight
  });

  delete this._sum;
  delete this._totals;

  return this.length - 1;
};

WeightedArray.prototype.get = function () {
  return this[this._randomIndex()].value;
};

/**
 * Returns an index by weighted random distribution.
 * @method _randomIndex
 * @protected
 * @return {Number}
 */
WeightedArray.prototype._randomIndex = function () {
  var maximumIndex,
    me = this,
    middleIndex,
    minimumIndex = 0,
    random,
    sum = me._sum,
    total,
    totals = me._totals;

  if (!sum || !totals) {
    me._update();

    sum = me._sum;
    totals = me._totals;

    if (!sum || !totals || !totals.length) {
      return null;
    }
  }

  maximumIndex = totals.length - 1;
  random = Math.random() * sum;

  while (maximumIndex >= minimumIndex) {
    middleIndex = (maximumIndex + minimumIndex) / 2;

    if (middleIndex < 0) {
      middleIndex = 0;
    } else {
      middleIndex = Math.floor(middleIndex);
    }

    total = totals[middleIndex];

    if (random === total) {
      middleIndex += 1;
      break;
    } else if (random < total) {
      if (middleIndex && random > totals[middleIndex - 1]) {
        break;
      }

      maximumIndex = middleIndex - 1;
    } else if (random > total) {
      minimumIndex = middleIndex + 1;
    }
  }

  return middleIndex;
};

/**
 * Updates chached data for achieving weighted random distribution.
 * @method _update
 * @chainable
 * @protected
 */
WeightedArray.prototype._update = function () {
  var me = this,
    sum = 0,
    totals = [];

  me.forEach(function (item) {
    sum += item.weight;
    totals.push(sum);
  });

  me._sum = sum;
  me._totals = totals;

  return me;
};
