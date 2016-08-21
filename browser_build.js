var browserify = require('browserify');
var babelify = require('babelify');

var b = browserify('./lib/index.js', {
  transform: [
    "babelify",
    "brfs"
  ],
  basedir: __dirname,
  debug: true
});

b.bundle().pipe(process.stdout);
