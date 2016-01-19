
var fs = require('fs');
var util = require('./util');

module.exports.run = function(run_id, data_directory, queue) {
  var state = {};
  state['detail_path'] = data_directory + "/rankin_" + run_id + ".detail";
  state['detail_stream'] = fs.createWriteStream(state['detail_path'], {'flags': 'a'});
  state['summary_path'] = data_directory + "/rankin_" + run_id + ".summary";
  state['summary_stream'] = fs.createWriteStream(state['summary_path'], {'flags': 'a'});
  state['queue'] = queue;
  state['default_delay'] = 50;
  state['detail_lines'] = [];

  setTimeout(function write_result(state) {
    if(state.queue.isEmpty()) {
      if(state.detail_lines.length > 0) {
        write_lines_to_stream(state.detail_lines, state.detail_stream);
        state.detail_lines = [];
      }
      setTimeout(write_result, state.default_delay, state);
    } else {
      if(state.detail_lines.length % 100 == 0) {
        write_lines_to_stream(state.detail_lines, state.detail_stream);
        state.detail_lines = [];
      }

      var record = state.queue.dequeue();

      if(record.record_type == "detail") {
        state.detail_lines.push(JSON.stringify(record));
      } else if(record.record_type == "summary") {
        state.summary_stream.write(JSON.stringify(record) + "\n");
      } else {
        if(state.detail_lines.length > 0) {
          var data = state.detail_lines.join("\n") + "\n";
          state.detail_lines = [];
          state.detail_stream.end(data);
        } else {
          state.detail_stream.end();
        }

        state.summary_stream.end();
        util.log("Terminated result writer.");
        util.log('Terminated benchmark.');
        process.exit();
      }

      if(state.detail_lines.length % 100 == 0) {
        setTimeout(write_result, 0, state);
      } else {
        write_result(state);
      }
    }
  }, state.default_delay, state);
}

function write_lines_to_stream(lines, stream) {
  if(lines.length > 0) {
    var data = lines.join("\n") + "\n";
    stream.write(data);
  }

  return;
}

