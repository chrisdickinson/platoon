var fs    = require('fs')
  , path  = require('path')

Function.prototype.then = function(fn) {
  var self = this

  return function() {
    var args = [].slice.call(arguments)
    return fn.call(this, self.apply(this, args)) 
  }
}

String.prototype.method = function() {
  var self = this
  return function(obj) {
    return obj[self]()
  }
}

function read(d, f) {
  return fs.readFileSync(path.join(d, f), 'utf8') 
}

module.exports = function(target, files, include) {
  var platoon   = read(__dirname, 'platoon.js')
    , includes  = include.map(read.bind(null, process.cwd()))
    , orequire  = require.extensions['.js']
    , isDir     = fs.lstatSync.then('isDirectory'.method())
    , tests     = []

  files = files.map(function(file) {
    if(isDir(file)) {
      return path.join(file, 'index.js')
    }
    return file
  })


  // oh, fun, fun, fun.
  require.extensions['.js'] = function require(module, filename) {
    if(~files.indexOf(module.parent ? module.parent.filename : NaN)) { 
      console.log('adding '+filename.replace(process.cwd(), '.'))
      tests.push([filename, fs.readFileSync(filename, 'utf8')])
    }

    return orequire(module, filename)
  }

  files.map(require)

  require.extensions['.js'] = orequire

  tests = tests.map(wrap_test).join('')
  tests = '(function(testrunner) {;'+tests+'; return testrunner;})(platoon.makeHTMLTestRunner()).run()'
  template = template.toString().replace(/^\s+/g, '').replace(/\s+$/g, '')
  template = template.slice(template.indexOf('/*')+2)
  template = template.slice(0, template.indexOf('*/'))

  template = template.replace('{{ INCLUDE }}',  includes.map(function(src) { return '<script>'+src+'</script>' }).join('\n'))
  template = template.replace('{{ PLATOON }}',  '<script>'+platoon+'</script>')
  template = template.replace('{{ TESTS }}',    '<script>'+tests+'</script>')

  fs.writeFileSync(target, template)

  function template () {/*<!doctype html><meta charset="utf8">
    <title>platoon tests</title>
    <body></body>
    {{ INCLUDE }}
    {{ PLATOON }}
    {{ TESTS }}
  */}

}

function wrap_test(test) {
  var filename  = test[0].replace(process.cwd(), '.')
    , source    = test[1]
    , base

  base = function(require, exports) {
    ;TEST
  }.toString().replace('TEST', source)

  base = '('+base+')(Function(), testrunner.make('+JSON.stringify(filename)+'));'
  return base
}
