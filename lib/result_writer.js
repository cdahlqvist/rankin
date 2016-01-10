
var fs = require('fs');
var util = require('./util');

module.exports.run = function(run_id, data_directory, queue) {
  var state = {};
  state['detail_path'] = data_directory + "/rankin_" + run_id + ".detail";
  state['detail_stream'] = fs.createWriteStream(state['detail_path'], {'flags': 'a'});
  state['summary_path'] = data_directory + "/rankin_" + run_id + ".summary";
  state['summary_stream'] = fs.createWriteStream(state['summary_path'], {'flags': 'a'});
  state['queue'] = queue;
  state['terminate'] = false;
  state['default_delay'] = 100;

  setTimeout(function write_result(state) {
    if(!state.queue.isEmpty() || !state.terminate) {
      if(state.queue.isEmpty()) {
        setTimeout(write_result, state.default_delay, state);
      } else {
        var record = state.queue.dequeue();

        if(record.record_type == "detail") {
          state.detail_stream.write(JSON.stringify(record) + "\n");
        } else if(record.record_type == "summary") {
          state.summary_stream.write(JSON.stringify(record) + "\n");
        } else {
          util.log("Initiating termination of result writer.");
          state.terminate = true;
          setTimeout(write_result, 0, state);
        }

        if(!state.queue.isEmpty()) {
          setTimeout(write_result, state.default_delay, state);
        } else {
      	  setTimeout(write_result, 0, state);
        }
      }
    } else {
    	state.summary_stream.end();
    	state.detail_stream.end();
    	util.log("Terminated result writer.");
    	util.log('Terminated benchmark.');
        process.exit();
    };
  }, state.default_delay, state);
}


