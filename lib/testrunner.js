var platoon = require('./platoon'),
    sys = require('sys');

exports.runTests = function(tests) {
    var createRunTroopTest = function(platoon_instance) {
        return function(callback) {
            platoon_instance.runTests({}, callback);
        };
    };

    var allTests = [];
    for(var name in tests) if(tests.hasOwnProperty(name) && tests[name].classname === 'platoon.TestCase') {
        allTests.push(createRunTroopTest(tests[name](name))); 
    }

    var i = 0,
        len = allTests.length,
        finishedTests = [],
        finallyReturn = function() {
            for(var index = 0, testlen = finishedTests.length; index < testlen; ++index) {
                var test = finishedTests[index][0],
                    assertionSets = finishedTests[index][1];
                sys.puts(test.name);
                for(var j = 0, len = assertionSets.length; j < len; ++j) {
                    var set = assertionSets[j],
                        color = set.errors.length > 0 ? '33' :
                                set.failures.length > 0 ? '31' : 
                                '32';

                    var total = set.failures.length + set.passes.length;
                    sys.puts('\t\033['+color+'m'+'('+set.passes.length+'/'+total+') '+set.name);
                    if(set.errors.length) {
                        sys.print('\033[33m');
                        for(var x = 0, xlen = set.errors.length; x < xlen; ++x) {
                            sys.puts('\t\t'+set.errors[x].message);
                            sys.puts(set.errors[x].stack.replace(/\n/g, '\n\t\t'));
                        }
                    }
                    if(set.failures.length) {
                        sys.print('\033[31m');
                        for(var x = 0, xlen = set.failures.length; x < xlen; ++x) {
                            sys.puts('\t\t'+set.failures[x][1].join(' '+set.failures[x][0]+' '));
                            var stack = '\t\t'+ set.failures[x][2].stack;
                            stack = stack.split('\n').slice(2);
                            for(var si = 0, silen = stack.length; si < silen; ++si) {
                                stack[si] = stack[si].replace(/^\s*/g, '');
                            }
                            sys.puts("\t\t"+stack.join('\n\t\t'));
                        }
                    }
                    sys.print('\033[37m');
                } 
            }
        },
        accumulateResults = function(testcase, assertionset) {
            if(testcase) {
                finishedTests.push([testcase, assertionset]);
            }
            if(i < len) {
                allTests[i++](arguments.callee);
            } else {
                finallyReturn();
            }
        };

    accumulateResults();
};
