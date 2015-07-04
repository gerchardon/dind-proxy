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
  .option('-n, --name [name]', 'Domain Name', 'local')
  .option('-i, --image [image]', 'Image to proxy, default: ', collect, ['jpetazzo/dind:latest'])
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
  if(program.image.indexOf(meta.image) > -1) {
    container.inspect(function(err, data) {
      winston.debug('Add route : %s -> %s', meta.name, data.NetworkSettings.IPAddress, {});
      router[meta.name] = data.NetworkSettings.IPAddress;
    });
  }
});
ee.on('stop', function(meta, container){
  delete router[meta.name];
});

function getVirtualHostFromHeaders(headers) {
  var headerHost = headers['host'];
  var host = headerHost.split(':')[0];
  return host.replace('.'+program.name, '')
    .replace(program.name, '');
}

function getTargetForHost(host) {
  if(host === null || host === '') return program.host;
  if(_.has(program.filter, host)) return _.get(program.filter, host);
  var target = null;
  var user = null;
  var env = null;
  var port = 80;
  var info = host.split(".");

  if(info.length === 1){
    user = info[0];
    env = user;
  }else if(info.length === 2) {
    user = info[1];
    env = info[0];
  }else if(info.length === 3) {
    user = info[1];
    env = info[0];
    port = info[2];
  }
  var dockerName = user + '.' + env;
  if(dockerName in router) {
    target = 'http://' + router[dockerName] + ':' + port;
  }
  return target;
};

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
