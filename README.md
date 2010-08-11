PLATOON
===========================

A simple testing framework centered around the thought that Javascript test frameworks should operate on callbacks
so asynchronous bits aren't quite so much of a hassle to test.

Running tests
---------------------------
Assuming you've installed the package, you should have `platoon` on your `$PATH`, so you can:

    platoon <testfile>

Or just run platoon and let it try to figure out where your tests are (it looks for `tests.js`)

Writing tests
---------------------------
This should seem (mostly) very familiar to you if you've used any other Javascript testing framework (vows.js, qunit, etc).

    var platoon = require('platoon');

    exports.ExampleTest = platoon.unit({
        setUp:function(callback) {
            callback();
        },
        tearDown:function(callback) {
            callback();
        },
    },
    function(assert) {
        "The name of this particular test item";
        assert.equal(0, 0);
        assert.throws(Error, function() {
            throw new Error();
        });
    },
    function(assert) {
        "The name of another test item";
        var Actor = function() {},
            garyBusey = new Actor();
        assert.isInstance(garyBusey, Actor);
        assert.isInstance(garyBusey, [String, Actor, Object]);  // if it's any one of these types, it'll pass
    });


Would be the basic example. **Note the single line strings**: they are the description strings for your test function. Also not that `setUp` and `tearDown` take a callback each, and **must** explicitly execute it when they're done (this lets you do asynchronous setup -- for instance, if you need to grab data from a server before running your test, or if you need to delete something from a database after your test.)

For asynchronous tests:

    exports.AsyncTest = platoon.unit({},
        function(assert) {
            jQuery.getJSON('/some/resource', assert.async(function(data) { 
                assert.equal(data.length, some_number);
            }));
    });

And now your unit test won't exit until the wrapped `assert.async` function is called.

Assertion Functions
-------------------

* ok (value)
* fail (value)
* equal (lhs, rhs)
* notEqual (lhs, rhs)
* strictEqual (lhs, rhs)
* strictNotEqual (lhs, rhs)
* throws (type, fn, args_to_fn...)
* doesNotThrow (fn)
* isInstance (obj, type | [type1, type2, type3])




