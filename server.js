var http = require('http'),
    httpProxy = require('http-proxy'),
    allContainers = require('docker-allcontainers'),
    program = require('commander'),
    _ = require('lodash'),
    winston = require('winston');

function collect(val, memo) {
  memo.push(val);
  return memo;
}
function filter(val, memo) {
  memo[val.split('=')[0]] = val.split('=')[1];
  return memo;
}

program
  .version('0.1.0')
  .option('-h, --host [host]', 'Default host url')
  .option('-n, --name [name]', 'Domain Name', '127.0.0.1.xip.io')
  .option('-i, --image [image]', 'Image to proxy, default: ', collect, [])
  .option('-f, --filter [filter]', 'Filter', filter, {} )
  .option('-v, --verbose', 'Verbose mode')
  .parse(process.argv);

winston.cli();
if(program.verbose) {
  winston.level = 'debug';
}

var ee = allContainers({
  preheat: true,
  docker: null
});

// Contains all dind launch
var router = {};

ee.on('start', function(meta, container){
  winston.debug('New Container start :', meta);
  if(_.isEmpty(program.image) || _.has(program.image, meta.image)) {
    container.inspect(function(err, data) {
      if(data.NetworkSettings.IPAddress) {
        winston.debug('Add route : %s -> %s', meta.name, data.NetworkSettings.IPAddress, {});
        router[meta.name] = data.NetworkSettings.IPAddress;
      }
    });
  }
});
ee.on('stop', function(meta, container){
  delete router[meta.name];
});

function getVirtualHostFromHeaders(headers) {
  var headerHost = headers.host;
  var host = headerHost.split(':')[0];
  return host.replace('.'+program.name, '')
    .replace(program.name, '');
}

function getTargetForHost(host) {
  if(host === null || host === '') return program.host;
  if(_.has(program.filter, host)) return _.get(program.filter, host);
  var target = null;
  var port = 80;

  var dockerName = host;
  if(_.has(router, dockerName)) {
    target = 'http://' + router[dockerName] + ':' + port;
  }
  return target;
}

var proxy = httpProxy.createProxyServer({});

var server = http.createServer(function(req, res) {
  var host = getVirtualHostFromHeaders(req.headers);
  var target = getTargetForHost(host);
  if (target) {
    proxy.web(req, res, {target: target}, function(e){
      console.log('No server %s', target);
      res.statusCode = 404;
      res.end('No server at port : '+target);
    });
  }else{
    // TODO: Logger..
    console.log("Not found for host : %s", host);
    res.statusCode = 404;
    res.end('No docker container launcher for user.');
  }
});
server.on('upgrade', function(req, socket, head){
  var host = getVirtualHostFromHeaders(req.headers);
  var target = getTargetForHost(host);
  proxy.ws(req, socket, head, {target: target});
});

console.log("listening on port 80");
server.listen(80);
