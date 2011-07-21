var bunker = require('bunker'),
    fs = require('fs'),
    vm = require('vm'),
    path = require('path');

var create_env = function(module, filename) {
    var Module = module.constructor;
    


    var req = function(path) {
      return Module._load(path, module);
    };
    req.resolve = function(request) {
      return Module._resolveFilename(request, module)[1];
    }
    req.paths = Module._paths;
    req.main = process.mainModule;
    req.extensions = Module._extensions;
    req.registerExtension = function() {
      throw new Error('require.registerExtension() removed. Use ' +
                      'require.extensions instead.');
    }
    require.cache = Module._cache;

    var ctxt = {};
    for(var k in global)
      ctxt[k] = global[k];

    ctxt.require = req;
    ctxt.exports = module.exports;
    ctxt.__filename = filename;
    ctxt.__dirname = path.dirname(filename);
    ctxt.process = process;
    ctxt.console = console;
    ctxt.module = module;
    ctxt.global = ctxt;
    ctxt.global.Function = Function;

    return ctxt;
};

var setup_cover = function(on_path) {
  var bunker_data = {},
      original_require = require.extensions['.js'],
      match = new RegExp(on_path ? on_path.replace('/', '\\/').replace('.', '\\.') : '.*', 'g');

  require.extensions['.js'] = function(module, filename) {
    if(!match.test(filename)) {
      return original_require(module, filename);
    }

    var ctxt = create_env(module, filename),
        data = fs.readFileSync(filename, 'utf8'),
        bunkerized = bunker(data);

    bunker_data[filename] = {bunker:bunkerized};

    bunkerized.on('node', function(node) {
      bunker_data[filename][node.id] = bunker_data[filename][node.id] || {node:node, count:0};
      ++bunker_data[filename][node.id].count;
    });

    bunkerized.buildContext(ctxt);

    var wrapper = module.constructor.wrap(bunkerized.compile());
    var names = Object.keys(bunkerized.names).map(function(name) { return bunkerized.names[name]; }),
        vals = names.map(function(name) { return ctxt[name]; });;

    wrapper = '(function ('+names.join(',')+') { return '+wrapper+'})';

    var compiledWrapper = vm.runInThisContext(wrapper, filename, true),
        reallyCompiledWrapper = compiledWrapper.apply({}, vals);

    var args = [ctxt.exports, ctxt.require, module, filename, ctxt.__dirname];
    return reallyCompiledWrapper.apply(module.exports, args);
  };

  return function(next) {
    Object.keys(bunker_data).sort().forEach(function(filename) {
      var nodes = bunker_data[filename];
      var missed = nodes.bunker.nodes.filter(function(node) {
        return !(nodes[node.id]);
      });

      var seen_lines = [];
      var filedata = require('fs').readFileSync(filename, 'utf8').split('\n'),
          padlen = filedata.length.toString().length;

      var pad = function(num) {
        num = num.toString();
        while(num.length < padlen) {
          num = ' '+num;
        }
        return '\033[36m'+num+'\033[0m';
      };

      var line_data = {};

      var output = missed.sort(function(lhs, rhs) {
        return lhs.node[0].start.line < rhs.node[0].start.line ? -1 :
               lhs.node[0].start.line > rhs.node[0].start.line ? 1  :
               0;
      }).filter(function(node) {
        var okay = (seen_lines.indexOf(node.node[0].start.line) < 0);
        line_data[node.node[0].start.line] = line_data[node.node[0].start.line] || [];
        line_data[node.node[0].start.line].push(node);

        if(okay)
          seen_lines.push(node.node[0].start.line);
        return okay;
      }).map(function(node) {
        var line = filedata[node.node[0].start.line],
            exprs = line_data[node.node[0].start.line];

        exprs.forEach(function(expr) {
          var src = expr.source(),
              idx = line.indexOf(src);

          if(idx > -1) {
            line = line.split('');
            line.splice(idx+src.length+1, 0, '\033[0m');
            line.splice(idx, 0, '\033[31m');
            line = line.join(''); 
          }
        });

        return pad(1+node.node[0].start.line) + '|  ' + line;
      });

      if(output.length) {
        console.error('\n%s: %s out of %s lines', filename, nodes.bunker.nodes.length - missed.length, nodes.bunker.nodes.length);
        console.error(output.join('\n'));
      }
    });
    next && next();
  };
};

exports.setup_cover = setup_cover;
