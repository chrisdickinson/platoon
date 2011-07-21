var nopt = require('nopt'),
    path = require('path'),
    cover = require('./cover'),
    testrunner = require('./testrunner');

var CLI = module.exports = function(args) {
  var options = {
    'cover':[path, null],
    'format':['short', 'long', null],
  };
  var shorthand = {
    'c':'--cover',
    'f':'--format',
    's':'--format short',
    'l':'--format long'
  };

  var parsed = nopt(options, shorthand, args),
      onfinish = function(next){next();},
      test_files = parsed.argv.remain.map(function(filename) {
        return path.resolve(filename);  
      });

  !test_files.length && (test_files = [path.resolve('tests')]);

  if(parsed.cover) {
    onfinish = cover.setup_cover(parsed.cover);
  }

  testrunner.runTests(
    test_files,
    parsed.format,
    onfinish
  );
};
