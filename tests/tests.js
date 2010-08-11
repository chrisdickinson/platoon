var platoon = require('platoon'),
    unit = platoon.unit,
    TestCase = platoon.TestCase,
    AssertionSet = platoon.AssertionSet;

exports.BasicsTest = unit({
    },  function(assert) {
        "Assert that testcase returns a function.";
        assert.isInstance(unit({}), Function);
    },  function(assert) {
        "Assert that calling the function returned by test case returns an instance of TestCase.";
        var random_name = "rand-"+Math.random(),
            result = unit({})(random_name);
        assert.isInstance(result, TestCase);
        assert.equal(random_name, result.name); 
    }
);

exports.AsyncTests = unit({
    },  function(assert) {
        "Assert that creating an async callback from a testcase instance increments the `pending` value."; 
        var random_name = "rand-"+Math.random(),
            random_value = parseInt(Math.random()*100, 10),
            assertionSet = new AssertionSet(random_name, function(_assert) {
                assert.isInstance(_assert, AssertionSet);
                assert.equal(_assert.pending, 0);
                var wrapped = _assert.async(function(incoming_random) {
                    assert.equal(_assert.pending, 0);
                    _assert.equal(incoming_random, random_value);
                    _assert.equal(Math.random()+1, 0);
                    return "EHHH";
                });
                assert.equal(_assert.pending, 1);
                wrapped(random_value);
            });
        assertionSet.execute(assert.async(function() {
            assert.equal(assertionSet.passes.length, 1);
            assert.equal(assertionSet.failures.length, 1);
        }));
    },  function(assert) {
        "Assert that tests will wait until all async functions return to complete the AssertionSet";
        setTimeout(assert.async(function() {
            assert.ok(true);
        }), 100);
    }
);

exports.AssertionTests = unit({},
    function(assert) {
        "Assert that `ok` works as expected";
        var random_name = "rand-"+Math.random(),
            assertion = new AssertionSet(random_name, function(_assert) {
                _assert.ok(true);
                _assert.ok({});
                _assert.ok("");
                _assert.ok(false);
                _assert.ok(null);
                _assert.ok(undefined);
            });
        assertion.execute(assert.async(function() {
            assert.equal(assertion.passes.length, 2);
            assert.equal(assertion.failures.length, 4);
        }));
    },
    function(assert) {
        "Assert that `fail` works as expected";
        var random_name = "rand-"+Math.random(),
            assertion = new AssertionSet(random_name, function(_assert) {
                _assert.fail(true);
                _assert.fail({});
                _assert.fail("");
                _assert.fail(false);
                _assert.fail(null);
                _assert.fail(undefined);
            });
        assertion.execute(assert.async(function() {
            assert.equal(assertion.failures.length, 2);
            assert.equal(assertion.passes.length, 4);
        }));
    },
    function(assert) {
        "Assert that `equal` works as expected";
        var random_name = "rand-"+Math.random(),
            assertion = new AssertionSet(random_name, function(_assert) {
                // failing
                _assert.equal(1, 0);
                _assert.equal("sdf", Math.random());

                // passing -- include js weirdness to prove we're using the '==' operator
                _assert.equal("", 0);
                _assert.equal("0", 0);
                _assert.equal(1, 1);
                _assert.equal([1], 1);
            });
        assertion.execute(assert.async(function() {
            assert.equal(assertion.failures.length, 2);
            assert.equal(assertion.passes.length, 4);
        }));
    },
    function(assert) {
        "Assert that `notEqual` works as expected";
        var random_name = "rand-"+Math.random(),
            assertion = new AssertionSet(random_name, function(_assert) {
                // passing 
                _assert.notEqual(1, 0);
                _assert.notEqual("sdf", Math.random());

                // failing -- include js weirdness to prove we're using the '==' operator
                _assert.notEqual("", 0);
                _assert.notEqual("0", 0);
                _assert.notEqual(1, 1);
                _assert.notEqual([1], 1);
            });
        assertion.execute(assert.async(function() {
            assert.equal(assertion.passes.length, 2);
            assert.equal(assertion.failures.length, 4);
        }));
    },
    function(assert) {
        "Assert that `strictEqual` works as expected";
        var random_name = "rand-"+Math.random(),
            assertion = new AssertionSet(random_name, function(_assert) {
                // failing 
                _assert.strictEqual(1, 0);
                _assert.strictEqual("sdf", Math.random());
                _assert.strictEqual("", 0);
                _assert.strictEqual("0", 0);
                _assert.strictEqual([1], 1);

                // passing 
                _assert.strictEqual(1, 1);
                _assert.strictEqual("asdf", 'asdf');
            });
        assertion.execute(assert.async(function() {
            assert.equal(assertion.passes.length, 2);
            assert.equal(assertion.failures.length, 5);
        }));
    },
    function(assert) {
        "Assert that `strictNotEqual` works as expected";
        var random_name = "rand-"+Math.random(),
            assertion = new AssertionSet(random_name, function(_assert) {
                // passing 
                _assert.strictNotEqual(1, 0);
                _assert.strictNotEqual("sdf", Math.random());
                _assert.strictNotEqual("", 0);
                _assert.strictNotEqual("0", 0);
                _assert.strictNotEqual([1], 1);

                // failing 
                _assert.strictNotEqual(1, 1);
                _assert.strictNotEqual("asdf", 'asdf');
            });
        assertion.execute(assert.async(function() {
            assert.equal(assertion.failures.length, 2);
            assert.equal(assertion.passes.length, 5);
        }));
    },
    function(assert) {
        "Assert that `isInstance` works as expected";
        var Gary = function() {},
            busey = new Gary();
        var random_name = "rand-"+Math.random(),
            assertion = new AssertionSet(random_name, function(_assert) {
                _assert.isInstance(busey, Gary);
                _assert.isInstance(Gary, [Function]);
                _assert.isInstance(Gary, [String, Object, Function]);
                _assert.isInstance(busey, [String, Number]);
                _assert.isInstance("this is a gotcha", String); // false!
            });
        assertion.execute(assert.async(function() {
            assert.equal(assertion.failures.length, 2);
            assert.equal(assertion.passes.length, 3);
        }));
    },
    function(assert) {
        "Assert that `throws` works as expected";
        var Gary = function() {};
        var random_name = "rand-"+Math.random(),
            assertion = new AssertionSet(random_name, function(_assert) {
                var throwsError = function() {
                    throw new Error();
                };
                var throwsGary = function() {
                    throw new Gary();
                };
                var doesNotThrow = function(incoming) {
                    assert.equal(incoming, random_name);
                    return incoming;
                };
                // pass 
                _assert.throws(Error, throwsError);
                _assert.throws(Gary, throwsGary);

                // fail
                _assert.throws(Error, throwsGary);
                _assert.throws(Gary, throwsError);
                _assert.throws(Error, doesNotThrow, random_name);
            });
        assertion.execute(assert.async(function() {
            assert.equal(assertion.failures.length, 3);
            assert.equal(assertion.passes.length, 2);
        }));
    },
    function(assert) {
        "Assert that `doesNotThrow` works as expected";
        var Gary = function() {};
        var random_name = "rand-"+Math.random(),
            assertion = new AssertionSet(random_name, function(_assert) {
                var throwsError = function() {
                    throw new Error();
                };
                var throwsGary = function() {
                    throw new Gary();
                };
                var doesNotThrow = function(incoming) {
                    assert.equal(incoming, random_name);
                    return incoming;
                };
                // fail
                _assert.doesNotThrow(throwsError);
                _assert.doesNotThrow(throwsGary);

                // pass
                _assert.doesNotThrow(doesNotThrow, random_name);
            });
        assertion.execute(assert.async(function() {
            assert.equal(assertion.failures.length, 2);
            assert.equal(assertion.passes.length, 1);
        }));
    }
);
