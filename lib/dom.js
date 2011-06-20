platoonRunner = function() {
    var keys = Object.keys ? function(obj) {
        return Object.keys(obj);
    } : function(obj) {
        var accum = [];
        for(var name in obj) if(obj.hasOwnProperty(name)) {
            accum.push(name);
        }
        return accum;
    };

    var test_keys = function(obj) {
        var _keys = keys(obj).slice(),
            out = [],
            incoming;
        while(_keys.length) {
            incoming = _keys.shift();
            if(exports[incoming].classname == 'platoon.TestCase') {
                out.push(incoming);
            }
        }
        return out;
    };

    var difference = function(lhs, rhs) {
        var out = [];
        for(var lidx = 0, llen = lhs.length; lidx < llen; ++lidx) {
            for(var found = false, ridx = 0, rlen = rhs.length; ridx < rlen && !found; ++ridx) {
                found = rhs[ridx] == lhs[lidx]; 
            }
            if(!found) {
                out.push(lhs[lidx]);
            }
        }
        return out;
    };

    var test_names = [];

    setTimeout(function() {
        var callee = arguments.callee;
        try {
            var new_test_names = difference(test_keys(exports), test_names),
                tests = (function(names) {
                    var accum = [],
                        incoming;
                    while(names.length) {
                        incoming = names.shift();
                        test_names.push(incoming);
                        (function(platoon_instance) {
                            accum.push(function(callback) {
                                platoon_instance.runTests({}, callback);
                            });
                        })(exports[incoming](incoming));
                    }
                    return accum;
                })(new_test_names),
                finishedTests = [],
                len = tests.length,
                i = 0,
                finish = function() {
                    while(finishedTests.length) {
                        var test_and_set = finishedTests.shift(),
                            test = test_and_set[0],
                            set = test_and_set[1],
                            name = test.name,
                            test_status = (function() {
                                var error = '',
                                    failure = '',
                                    pass = '';
                                for(var k = 0, klen = set.length; k < klen; ++k) {
                                    if(set[k].failures.length) failure = 'fail';
                                    if(set[k].errors.length) error = 'error';
                                }
                                pass = !error.length && !failure.length ? 'pass' : '';
                                return [pass, error, failure].join(' ');
                            })(),
                            test_target = $('#'+name+' ul');
                        $('#'+name).attr('class', test_status);
                        for(var i = 0, len = set.length; i < len; ++i) {
                            var assertion = set[i],
                                total = assertion.failures.length + assertion.errors.length + assertion.passes.length,
                                passed = assertion.passes.length,
                                assertion_status = assertion.failures.length && assertion.errors.lengnth ? 'fail error' :
                                    assertion.failures.length ? 'fail' : assertion.errors.length ? 'error' : 'pass';

                            var traces = [];
                            if(assertion_status !== 'pass') {
                                for(var x = 0, xlen = assertion.errors.length; x < xlen; ++x) {
                                    traces.push('<div class="trace error"><pre><code>'+(assertion.errors[x].stack||assertion.errors[x])+'</code></pre></div>');
                                }
                                for(var x = 0, xlen = assertion.failures.length; x < xlen; ++x) {
                                    traces.push('<div class="trace fail"><pre><code>'+(assertion.failures[x].stack||assertion.failures[x])+'</code></pre></div>');
                                }
                            }


                            var output = $('<li class="'+assertion_status+'"><p>'+assertion.name+'</p>'+traces.join('\n')+'<div>');
                            test_target.append(output);
                        }
 
                    }
                },
                eterator = function(testcase, assertionset) {
                    if(testcase) {
                        output = $('<div id="'+testcase.name+'"><h2>'+testcase.name+'</h2><ul></ul></div>');
                        $('#target').append(output);
                        finishedTests.push([testcase, assertionset]);
                    }
                    if(i < len) {
                        tests[i++](arguments.callee);
                    } else {
                        finish();
                    }
                };
            eterator(null, null);
            setTimeout(callee, 100);
        } catch(err) {
            console.log(err);
        }
    }, 100);
};
