var express = require('express');
var net = require('net-browserify');
var httpProxy = require('http-proxy');
var url = require('url');

var app = express();
app.use(express.static('../../bin'));
app.use(express.static('static'));

var proxy = httpProxy.createProxyServer({
  target: 'http://api.playerio.com'
});

proxy.on('proxyReq', function (proxyReq, req) {
  var urlParts = url.parse(req.url);
  proxyReq.removeHeader('Origin');
  proxyReq.setHeader('host', 'api.playerio.com');
});

app.all('/pio/*', function (req, res) {
  req.url = req.url.replace('/pio/', '/api/');

  proxy.web(req, res, {target: 'http://api.playerio.com'});
});
app.use(net());

app.listen(process.env.PORT || 3000, function () {
  console.log('listending to port ' + (process.env.PORT || 3000));
});
