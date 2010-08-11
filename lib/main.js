var platoon = require('./platoon'),
    testrunner = require('./testrunner');

for(var i in platoon) if(platoon.hasOwnProperty(i)) {
    exports[i] = platoon[i];
}
for(var i in testrunner) if(testrunner.hasOwnProperty(i)) {
    exports[i] = testrunner[i];
}
