(function(global) {
    var TestCase = function(name, setup, teardown, testFns) {
        this.name = name;
        this.setUp = setup || function(cb) { cb() };
        this.tearDown = teardown || function(cb) { cb() };
        this.testFns = testFns;
    };

    // if a test waits for >30s, we abort it.
    TestCase.TIMEOUT = 30000;
    var Fail = {};

    var AssertionSet = function(name, fn, against) {
        this.name = name;
        this.fn = fn;

        this.against = against || {};
        this.pending = 0;
        this.passes = [];
        this.failures = [];
        this.errors = [];
    };

    AssertionSet.prototype.passed = function() {
      return this.failures.length === 0 && this.errors.length === 0;
    };

    AssertionSet.prototype.throwFail = function(fail) {
      this.failures.push(fail);
      throw Fail;
    };

    AssertionSet.prototype.execute = function(callback) {
        var self = this,
            started = +new Date,
            timeout = function () {
                if(self.pending > 0) {
                  if((+new Date)-started < TestCase.TIMEOUT)
                    setTimeout(timeout, 0);
                  else {
                    self.errors.push(['timed out', [], new Error()]);
                  }
                } else {
                    callback();
                }
            };
        try {
            self.fn.apply(self.against, [self]);
        } catch(err) {
            if(err !== Fail)
              self.errors.push(err);
        }
        setTimeout(timeout, 0);
    };

    AssertionSet.prototype.async = function(callback) {
        ++this.pending;
        var self = this,
            currentAgainst = self.against;
        return function() {
            --self.pending;
            try {
              return callback.apply(self.against, [].slice.call(arguments));
            } catch(err) {
              if(err !== Fail)
                self.errors.push(err);
            }
        };
    };

    AssertionSet.prototype.deepEqual = function(lhs, rhs, reentrant) {
        reentrant = reentrant !== undefined;
        var lhsKeys = [],
            rhsKeys = [],
            name = null;
        for(name in lhs) if(lhs.hasOwnProperty(name)) {
            lhsKeys.push(name);
        }
        for(name in rhs) if(rhs.hasOwnProperty(name)) {
            rhsKeys.push(name);
        }
        if(rhsKeys.length !== lhsKeys.length) {
            this.throwFail(['should deep equal', [lhs, rhs], new Error()]);
        } else {
            var failureLength = this.failures.length;
            for(var i = 0, len = lhsKeys.length; i < len; ++i) {
                var lhsObject = lhs[lhsKeys[i]],
                    rhsObject = rhs[rhsKeys[i]];
                if(lhsObject == rhsObject) {
                    continue;
                } else {
                    if(lhsObject instanceof Object && rhsObject instanceof Object) {
                        arguments.callee.apply(this, [lhsObject, rhsObject, true]);
                        if(failureLength !== this.failures.length) {
                            break;
                        }
                    } else {
                        this.throwFail(['should deep equal', [lhs, rhs], new Error()]);
                        break;
                    }
                }
            }
            if(failureLength === this.failures.length && !reentrant) {
                this.passes.push(['should deep equal', [lhs, rhs], new Error()]);
            }
        }
    };

    AssertionSet.prototype.ok = function(rhs) {
        var msg = ['should be truth-y', [rhs], new Error()];
        (rhs) ?
            this.passes.push(msg) :
            this.throwFail(msg);
    };

    AssertionSet.prototype.fail = function(rhs) {
        var msg = ['should be false-y', [rhs], new Error()];
        (rhs) ?
            this.throwFail(msg) : 
            this.passes.push(msg);
    };

    AssertionSet.prototype.equal = function(lhs, rhs) {
        var msg = ['should ==', [lhs, rhs], new Error()];
        (rhs == lhs) ?
            this.passes.push(msg) :
            this.throwFail(msg);
    };

    AssertionSet.prototype.notEqual = function(lhs, rhs) {
        var msg = ['should !=', [lhs, rhs], new Error()];
        (rhs == lhs) ?
            this.throwFail(msg) : 
            this.passes.push(msg);
    };

    AssertionSet.prototype.strictEqual = function(lhs, rhs) {
        var msg = ['should ===', [lhs, rhs], new Error()];
        (rhs === lhs) ?
            this.passes.push(msg) :
            this.throwFail(msg);
    };

    AssertionSet.prototype.strictNotEqual = function(lhs, rhs) {
        var msg = ['should !==', [lhs, rhs], new Error()];
        (rhs === lhs) ?
            this.throwFail(msg) :
            this.passes.push(msg);
    };

    AssertionSet.prototype.isInstance = function(lhs, class_list) {
        if(!(class_list instanceof Array)) {
            class_list = [class_list];
        }
        for(var i = 0, len = class_list.length; i < len; ++i) {
            if(lhs instanceof class_list[i]) {
                this.passes.push(['should instanceof', [lhs, class_list]]);
                return;
            }
        }
        this.throwFail(['should instanceof', [lhs, class_list], new Error()]);
    };

    AssertionSet.prototype.throws = function(error_class, fn) {
        if(!(error_class instanceof Array)) {
            error_class = [error_class];
        }
        try {
            fn.apply(arguments[2], [].slice.call(arguments, 2));
            this.throwFail(['should throw', [error_class, fn], new Error()]);
        } catch(err) {
            for(var i = 0, len = error_class.length; i < len; ++i) {
                if(err instanceof error_class[i]) {
                    this.passes.push(['should throw', [error_class, fn, err]]);
                    return;
                }
            }
            this.throwFail(['should throw', error_class.concat([fn]), new Error()]);
        }
    };

    AssertionSet.prototype.doesNotThrow = function(fn) {
        try {
            fn.apply(arguments[1], [].slice.call(arguments, 1));
            this.passes.push(['should not throw', [fn, null]]);
        } catch(err) {
            this.throwFail(['should not throw', [fn, err], new Error()]);
        }
    };

    TestCase.prototype.runTests = function(against, callback) {
        var self = this,
            i = -1,
            len = self.testFns.length,
            assertionSets = [],
            recurseTests = function() {
                ++i;
                var currentFunction = self.testFns[i];
                if(i >= len) {
                    return;
                }
                self.setUp(function() {
                    var assertionSet = new AssertionSet(self.getDocString(currentFunction), currentFunction, against);
                    assertionSet.execute(function() {
                        self.tearDown(function() {
                            assertionSets.push(assertionSet);
                            recurseTests();
                        });
                    });
                });
            },
            timeoutFunction = function() {
                if(assertionSets.length !== self.testFns.length) {
                    setTimeout(arguments.callee, 0);
                } else {
                    callback(self, assertionSets);
                }
            };
        recurseTests();
        setTimeout(timeoutFunction, 0);
    };

    TestCase.prototype.getDocString = function(fn) {
        if(fn.__doc__) return fn.__doc__;

        var re = /function\s*(.*?)\s*{\s*('(.*?)'|"(.*?)")/;
        var match = re.exec(fn.toSource ? fn.toSource() : fn.toString()),
            docstring = match ? match[2].slice(1, -1) : null;
        re.lastIndex = 0;
        fn.name = docstring;
        return docstring;
    };


    global.unit = function(opts) {
        var testFns = [].slice.call(arguments, 1),
            test = function(name) {
            return new TestCase(name, opts.setup, opts.teardown, testFns);
        };
        test.classname = 'platoon.TestCase';
        return test;
    };


    function HTMLTestRunner() {
      this.tests = {}
      this.target = document.getElementById('target')
      this.target.appendChild(this.pre = document.createElement('pre'))
    }

    var proto = HTMLTestRunner.prototype

    proto.make = function(name) {
      return (this.tests[name] = (this.tests[name] || {}))
    }

    proto.write = function(what) {
      var text = this.pre.innerHTML
        , last
        , lines
      text += what


      lines = text.split('\n')
      last = lines[lines.length-1]


      lines[lines.length - 1] =
        last.length > 80
          ? last.slice(0, 79) + '\n' + last.slice(79)
          : last
      this.pre.innerHTML = lines.join('\n')
    }

    proto.run = function() {
      var self = this
        , tests = []
        , finished = []
        , make_test = function(instance) {
            ret.instance = instance

            return ret
            function ret(ready) {
              instance.runTests({}, ready)
            }
          }
      for(var file in this.tests) {
        for(var unit in this.tests[file]) {
          tests.push(make_test(this.tests[file][unit](file + ': '+unit)))
        }
      }

      function accumulate(testcase, assertionset, next) {
        if(testcase) {
          for(var i = 0, set; set = assertionset[i]; ++i) {
            if(set.errors.length) self.write('E')
            else if(set.failures.length) self.write('F')
            else self.write('.')
          }
          finished.push({
              'testcase':testcase
            , 'assertionset':assertionset
          })
        }

        next = tests.shift()
        if(next) {
            return setTimeout(function() { next(accumulate) }, 0)
        }
        finish()
      }

      function finish() {
        for(var i = 0, len = finished.length; i < len; ++i) {
          var test = finished[i].testcase
            , sets = finished[i].assertionset

          for(var j = 0, set; set = sets[j]; ++j) {
            if(set.errors.length || set.failures.length) {
              self.write('\n in '+test.name+': '+set.name+'\n')
            }

            for(var x = 0, err; err = set.errors[x]; ++x) {
              self.write(err.stack ? err + '\n' + err.stack : err)
            }
            for(var x = 0, err; err = set.failures[x]; ++x) {
              self.write(err.stack ? err + '\n' + err.stack : err)
            }

          }
        }
      }
      platoon.beforeStart(accumulate)
    }


    global.makeHTMLTestRunner = function() {
      return new HTMLTestRunner()
    }

    global.beforeStart = function(ready) { ready(); };
    global.beforeFinish = function(ready) { ready(); };

    global.setBeforeStart = function(fn) { global.beforeStart = fn; };
    global.setBeforeFinish = function(fn) { global.beforeFinish = fn; };

    global.test = function(name, fn) {
        fn.__doc__ = name;
        return fn;
    };
    global.TestCase = TestCase;
    global.AssertionSet = AssertionSet;
})(typeof window === 'undefined' ? exports : (window.platoon = {}));
