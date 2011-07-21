var platoon = require('./platoon'),
    trace = require('tracejs').trace,
    tty = require('tty'),
    sys = require('util');

var is_tty = function() {
  return tty.isatty(process.stdout.fd) && tty.isatty(process.stderr.fd);
};

var Color = function(code) {
  this.code = code;
};

Color.prototype.start = function() {
  Color.stack.push(this);
  return '\033['+this.code+'m';
};

Color.prototype.end = function() {
  Color.stack.pop();
  return '\033['+Color.stack[Color.stack.length-1].code+'m';
};

Color.prototype.wrap = function(text) {
  return this.start() + text + this.end();
};

var color = is_tty() ?
  function(code) {
    return new Color(code);
  } :
  function(code) {
    return {
      start:function(){return ''},
      end:function(){return ''},
      wrap:function(text){ return text; }
    }
  };

var colors = {
  off:color(0),
  bold:color(1),
  italic:color(3),
  underline:color(4),
  blink:color(5),
  inverse:color(7),
  hidden:color(8),
  black:color(30),
  red:color(31),
  green:color(32),
  yellow:color(33),
  blue:color(34),
  magenta:color(35),
  cyan:color(36),
  white:color(37),
  black_bg:color(40),
  red_bg:color(41),
  green_bg:color(42),
  yellow_bg:color(43),
  blue_bg:color(44),
  magenta_bg:color(45),
  cyan_bg:color(46),
  white_bg:color(47)
};

Color.stack = [colors.off];


var FORMAT_LONG = {
  success:function(set) {
    var color = set.passed() ? 'green' : 'red',
        name = set.passed() ? set.name : colors.red.wrap(set.name);
    return '('+colors.green.wrap(set.passes.length)+'/'+colors[color].wrap(set.passes.length + set.failures.length)+') '+ name + '\n'; 
  },
  error:function(set) {
    var errors = [];
    return '\n'+set.errors.map(function(err) {
      if(err && err.stack) {
        try {
          return trace(err).toString(false, 2, true, 'red').replace(/\n/gm, '\n\t');
        } catch (e) {
          return err+''+err.stack;
        }
      } else {
        return err || '<UNKNOWN ERROR>';
      }
    }).join('\n');
  },
  failure:function(set) {
    return set.failures.map(function(failure) {
      var expectation = failure[0],
          values = failure[1],
          frame = trace(failure[2]).frames[1].toString(); 

      return ('\n' + 
             frame + '\n' +
             colors.white.wrap(expectation) + '\n' + 
             values.map(function(value, idx) {
                return colors.red.wrap('got for '+idx+':') + '\t' + sys.inspect(value, 1); 
             }).join('\n----\n')).replace(/\n/gm, '\n\t') + '\n';
    }).join('\n');
  },
  finish:function() {
    return '\n';
  }
};

var FORMAT_SHORT = {
  success:function(set, test) { return '.'; },
  failure:function(set, test) { this.accum.push(test.name+':\n'+FORMAT_LONG.failure(set)); return 'F'; },
  error:function(set, test) { this.accum.push(test.name+':\n'+FORMAT_LONG.error(set)); return 'E'; },
  finish:function() {
    if(this.accum.length)
      return ('\n' + this.accum.join('\n=====================================\n') + '\n');
    return '\n';
  },
  accum:[]
};

var run_tests = function(files, format, done) {
  var tests = {};
  files.forEach(function(file) {
    var incoming = require(file);
    for(var key in incoming) {
      tests[key] = incoming[key];
    }
  });

  var FORMAT = format === 'short' ? 
      FORMAT_SHORT :
      FORMAT_LONG;

  var create_test = function(instance) {
    var ret = function(ready) {
      instance.runTests({}, ready);
    };
    ret.instance = instance;
    return ret;
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

        finished.forEach(function(finished) {
          var test = finished[0],
              sets = finished[1];

          sets.forEach(function(set) {
            result += set.errors.length + set.failures.length;

          });
        });

        for(var i = 0, len = finished.length; i < len; ++i) {
          var test = finished[i][0],
              sets = finished[i][1];

          (FORMAT === FORMAT_LONG) &&
            process.stderr.write(colors.magenta.wrap(test.name+':')+'\n');

          sets.forEach(function(set) {
            result += (set.errors.length + set.failures.length);
            
            process.stderr.write(FORMAT.success(set, test));
            set.errors.length && process.stderr.write(FORMAT.error(set, test));
            set.failures.length && process.stderr.write(FORMAT.failure(set, test));
          });

        }
        process.stderr.write(FORMAT.finish());

        done(function() {
          var eventually = function() {
            platoon.beforeFinish(function() {
              setTimeout(function() { process.exit(result) }, 1);
            });
          };
          if(!process.stderr.write(' '))
            process.stderr.on('drain', eventually);
          else
            eventually();
        });
      };

  var accumulate = function(testcase, assertionset) {
    if(testcase) {
      finished.push([testcase, assertionset]);
    }
    if(all_tests.length) {
      var next = all_tests.shift();
      next(accumulate);
    } else {
      on_finish();
    }
  };

  platoon.beforeStart(accumulate);
};

exports.runTests = run_tests;
