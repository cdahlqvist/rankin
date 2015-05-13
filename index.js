/**
 * Notify user of updates
 */
var pkg = require('./package.json');
require('update-notifier')({ packageName: pkg.name, packageVersion: pkg.version }).notify();

var manager = require('./lib/manager');
