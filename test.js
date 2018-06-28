var test = require('tape')
var path = require('path')
var DwStreamWrap = require('./')
var fs   = require('fs')

var tmp = path.resolve(
  __dirname, 'tmp.txt'
)

function DwStreamWrapString(string) {
  return DwStreamWrap(function(size, next) {
    if (string.length <= 0) return next(null, null)
    var chunk = string.slice(0, size)
    string = string.slice(size)
    next(null, chunk)
  })
}

test('DwStreamWrap Tests: dwStreams Wrapper', function(t) {
  var contents = fs.readFileSync(__filename, 'utf8')
  var stream = DwStreamWrapString(contents)

  stream
    .pipe(fs.createWriteStream(tmp))
    .on('close', function() {
      t.equal(fs.readFileSync(tmp, 'utf8'), contents)
      fs.unlinkSync(tmp)
      t.end()
    })
})

test('DwStreamWrap Tests: Legacy Mode', function(t) {
  var contents = fs.readFileSync(__filename, 'utf8')
  var stream = DwStreamWrapString(contents)
  var buffer = ''

  stream.on('data', function(data) {
    buffer += data
  }).on('end', function() {
    t.equal(buffer, contents)
    t.end()
  })
})

test('DwStreamWrap Tests: Destroy', function(t) {
  var stream = DwStreamWrap(function(size, next) {
    process.nextTick(function() {
      next(null, 'no')
    })
  })

  stream.on('data', function(data) {
    t.ok(false)
  }).on('close', function() {
    t.ok(true)
    t.end()
  })

  stream.destroy()
})

test('DwStreamWrap Tests: Arrays', function (t) {
  var input = ['a', 'b', 'c']
  var stream = DwStreamWrap(input)
  var output = []
  stream.on('data', function (letter) {
    output.push(letter.toString())
  })
  stream.on('end', function () {
    t.deepEqual(input, output)
    t.end()
  })
})

test('DwStreamWrap Tests: Object Arrays', function (t) {
  var input = [{foo:'a'}, {foo:'b'}, {foo:'c'}]
  var stream = DwStreamWrap.obj(input)
  var output = []
  stream.on('data', function (letter) {
    output.push(letter)
  })
  stream.on('end', function () {
    t.deepEqual(input, output)
    t.end()
  })
})


test('DwStreamWrap Tests: Arrays Can Produce Errors', function (t) {
  var input = ['a', 'b', new Error('ooops'), 'c']
  var stream = DwStreamWrap(input)
  var output = []
  stream.on('data', function (letter) {
    output.push(letter.toString())
  })
  stream.on('error', function(e){
    t.deepEqual(['a', 'b'], output)
    t.equal('ooops', e.message)
    t.end()
  })
  stream.on('end', function () {
    t.fail('the stream should have errored')
  })
})

test('DwStreamWrap Tests: Object Arrays Can Produce Errors', function (t) {
  var input = [{foo:'a'}, {foo:'b'}, new Error('ooops'), {foo:'c'}]
  var stream = DwStreamWrap.obj(input)
  var output = []
  stream.on('data', function (letter) {
    output.push(letter)
  })
  stream.on('error', function(e){
    t.deepEqual([{foo:'a'}, {foo:'b'}], output)
    t.equal('ooops', e.message)
    t.end()
  })
  stream.on('end', function () {
    t.fail('the stream should have errored')
  })
})
