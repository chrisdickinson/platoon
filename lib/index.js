var platoon = require('./platoon'),
    testrunner = require('./testrunner'),
    browser = require('./browser');

for(var i in platoon) if(platoon.hasOwnProperty(i)) {
    exports[i] = platoon[i];
}
for(var i in testrunner) if(testrunner.hasOwnProperty(i)) {
    exports[i] = testrunner[i];
}
for(var i in browser) if(browser.hasOwnProperty(i)) {
    exports[i] = browser[i];
}
