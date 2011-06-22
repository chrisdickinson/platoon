var globalObject; 

try {
    if(document.getElementById) {
        window.platoon = {};
        globalObject = window.platoon;
    }
} catch(err) {
    globalObject = exports;
}

(function(global) {
    var TestCase = function(name, setup, teardown, testFns) {
        this.name = name;
        this.setUp = setup || function(cb) { cb() };
        this.tearDown = teardown || function(cb) { cb() };
        this.testFns = testFns;
    };

    // if a test waits for >30s, we abort it.
    TestCase.TIMEOUT = 30000;

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
            this.failures.push(['should deep equal', [lhs, rhs], new Error()]);
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
                        this.failures.push(['should deep equal', [lhs, rhs], new Error()]);
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
        (rhs ? this.passes : this.failures).push(['should be truth-y', [rhs], new Error()]); 
    };

    AssertionSet.prototype.fail = function(rhs) {
        (rhs ? this.failures : this.passes).push(['should be false-y', [rhs], new Error()]); 
    };

    AssertionSet.prototype.equal = function(lhs, rhs) {
        (rhs == lhs ? this.passes : this.failures).push(['should ==', [lhs, rhs], new Error()]);
    };

    AssertionSet.prototype.notEqual = function(lhs, rhs) {
        (rhs == lhs ? this.failures : this.passes).push(['should !=', [lhs, rhs], new Error()]);
    };

    AssertionSet.prototype.strictEqual = function(lhs, rhs) {
        (rhs === lhs ? this.passes : this.failures).push(['should ===', [lhs, rhs], new Error()]);
    };

    AssertionSet.prototype.strictNotEqual = function(lhs, rhs) {
        (rhs === lhs ? this.failures : this.passes).push(['should !==', [lhs, rhs], new Error()]);
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
        this.failures.push(['should instanceof', [lhs, class_list], new Error()]);
    };

    AssertionSet.prototype.throws = function(error_class, fn) {
        if(!(error_class instanceof Array)) {
            error_class = [error_class];
        }
        try {
            fn.apply(arguments[2], [].slice.call(arguments, 2));
            this.failures.push(['should throw', [error_class, fn], new Error()]);
        } catch(err) {
            for(var i = 0, len = error_class.length; i < len; ++i) {
                if(err instanceof error_class[i]) {
                    this.passes.push(['should throw', [error_class, fn, err]]);
                    return;
                }
            }
            this.failures.push(['should throw', [error_class, fn], new Error()]);
        }
    };

    AssertionSet.prototype.doesNotThrow = function(fn) {
        try {
            fn.apply(arguments[1], [].slice.call(arguments, 1));
            this.passes.push(['should not throw', [fn, null]]);
        } catch(err) {
            this.failures.push(['should not throw', [fn, err], new Error()]);
        }
    };

    TestCase.prototype.runTests = function(against, callback) {
        var self = this,
            i = -1,
            len = self.testFns.length,
            assertionSets = [],
            recurseTests = function() {
                ++i;
                var recurse = arguments.callee,
                    currentFunction = self.testFns[i];
                if(i >= len) {
                    return;
                }
                self.setUp(function() {
                    var assertionSet = new AssertionSet(self.getDocString(currentFunction), currentFunction, against);
                    assertionSet.execute(function() {
                        self.tearDown(function() {
                            assertionSets.push(assertionSet);
                            recurse();
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

    global.beforeStart = function(ready) { ready(); };
    global.beforeFinish = function(ready) { ready(); };

    global.TestCase = TestCase;
    global.AssertionSet = AssertionSet;
})(globalObject);
