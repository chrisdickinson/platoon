var fs = require('fs'),
    path = require('path'),
    url = require('url'),
    sys = require('sys'),
    plate,
    escaperoute,
    surl;

try {
    plate = require('plate');
    escaperoute = require('escaperoute');
    surl = escaperoute.surl;
} catch(err) {
}

var serverFunction = function(files) {
    if(!plate) {
        throw new Error("Please install plate (http://github.com/chrisdickinson/plate) to use platoon_browser.");
    }

    if(!escaperoute) {
        throw new Error("Please install escaperoute (http://github.com/chrisdickinson/escaperoute) to use platoon_browser.");
    }

    var template = new plate.Template(
        fs.readFileSync(path.join(path.dirname(__filename), 'browser.html')).toString()
    );

    files = files || {};
    files.testing = files.testing || {};
    files.tests = files.tests || {};
    files.testing['platoon'] = path.join(path.dirname(__filename), 'platoon.js');
    files.testing['dom'] = path.join(path.dirname(__filename), 'dom.js');

    var send_js = function(request, response, file_key) {
        var filename = files.testing[file_key] === undefined ? files.tests[file_key] : files.testing[file_key]; 
        if(filename) {
            var file = filename[0] == '/' ? filename : path.join(process.cwd(), filename);

            fs.readFile(file, function(err, data) {
                if(err) {
                    sys.debug(err);

                    response.writeHead(404, {});
                    response.end();
                } else {
                    response.writeHead(200, {'Content-Type':'application/javascript'});
                    response.write(data);
                    response.end();
                }
            });
        } else {
            response.writeHead(404, {});
            response.end();
        }
    };
    

    var run_tests = function(request, response, named_test) {
        var context = {
            scripts:Object.keys(files.testing),
            deferred:Object.keys(files.tests)
        };
        template.render(context, function(err, data) {
            if(!err) {
                response.writeHead(200, {'Content-Type':'text/html'});
                response.write(data);
                response.end();
            } else {
                response.writeHead(500, {'Content-Type':'text/html'});
                response.write("<h1>UH OH</h1>");
                response.end();
            }
        });
    };

    var routes = escaperoute.routes('',
        surl('js/([:w:d-_]+)/$', send_js, 'js'),
        surl('/$', run_tests, 'run_test'),
        surl('favicon.ico$', function(req, resp) {
            resp.writeHead(404, {});
            resp.end();
        }, 'favicon')
    );

    return function(request, response) {
        try {
            var parsed = url.parse(request.url)
            sys.puts(parsed.pathname);
            var match = routes.match(parsed.pathname);
            match(request, response);
        } catch(err) {
            sys.puts(err.stack);
            response.writeHead(404, {});
            response.end();
        }
    };
};

exports.server = serverFunction;
