var platoon = require('./platoon'),
    sys = require('sys');


var FORMAT_LONG = {
  success:function(set) {
    return '('+set.passes.length+'/'+(set.passes.length + set.failures.length)+') '+set.name; 
  },
  error:function(set) {
    var errors = [];
    return set.errors.map(function(err) {
      return '\t\t'+err.message + err.stack.replace(/\n/g, '\n\t\t'); 
    }).join('\n');
  },
  failure:function(set) {
    return set.failures.map(function(failure) {
      return [
        '\t\t'+failure[1].join(' '+failure[1]+' '),
        failure[2].stack.replace(/\n/g, '\n\t\t')
      ].join('\n');
    }).join('\n');
  },
  finish:function() {

  }
};

var FORMAT_SHORT = {
  success:function(set, test) { return '.'; },
  failure:function(set, test) { this.accum.push(test.name+':\n'+FORMAT_LONG.failure(set)); return 'F'; },
  error:function(set, test) { this.accum.push(test.name+':\n'+FORMAT_LONG.error(set)); return 'E'; },
  finish:function() {
    this.accum.length &&
      sys.print('\n\033[37m'+this.accum.join('\n=====================================\n'));
  },
  accum:[]
};

var FORMAT = process.argv.indexOf('--short') === -1 ? 
  FORMAT_LONG :
  FORMAT_SHORT;

var run_tests = function(tests, format) {
  var create_test = function(instance) {
    return function(ready) {
      instance.runTests({}, ready);
    };
  };

  var all_tests = [];
  for(var name in tests) {
    var test = tests[name];
    if(test.classname == 'platoon.TestCase')
      all_tests.push(
        create_test(
          test(name)
        )
      );
  }

  var finished = [],
      on_finish = function() {
        var result = 0;
        for(var i = 0, len = finished.length; i < len; ++i) {
          var test = finished[i][0],
              sets = finished[i][1];

          sets.forEach(function(set) {
            result += (set.errors.length + set.failures.length);
            
            sys.print('\033[32m'+FORMAT.success(set, test));
            set.errors.length && sys.print('\033[33m'+FORMAT.error(set, test));
            set.failures.length && sys.print('\033[31m'+FORMAT.failure(set, test));
          });

        }
        FORMAT.finish();
        process.exit(result);
      };

  var accumulate = function(testcase, assertionset) {
    if(testcase) {
      finished.push([testcase, assertionset]);
    }
    if(all_tests.length) {
      all_tests.shift()(accumulate);
    } else {
      on_finish();
    }
  };

  accumulate();
};

exports.runTests = run_tests;
