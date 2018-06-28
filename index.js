var Readable = require('readable-stream').Readable
var inherits = require('inherits')

module.exports = dws2wrap

dws2wrap.ctor = ctor
dws2wrap.obj = obj

var DwStreamWrap = ctor()

function toFunction(list) {
  list = list.slice()
  return function (_, cb) {
    var err = null
    var item = list.length ? list.shift() : null
    if (item instanceof Error) {
      err = item
      item = null
    }

    cb(err, item)
  }
}

function dws2wrap(opts, read) {
  if (typeof opts !== 'object' || Array.isArray(opts)) {
    read = opts
    opts = {}
  }

  var rs = new DwStreamWrap(opts)
  rs._from = Array.isArray(read) ? toFunction(read) : (read || noop)
  return rs
}

function ctor(opts, read) {
  if (typeof opts === 'function') {
    read = opts
    opts = {}
  }

  opts = defaults(opts)

  inherits(dwStreamWrapClass, Readable)
  function dwStreamWrapClass(override) {
    if (!(this instanceof dwStreamWrapClass)) return new dwStreamWrapClass(override)
    this._reading = false
    this._callback = check
    this.destroyed = false
    Readable.call(this, override || opts)

    var self = this
    var hwm = this._readableState.highWaterMark

    function check(err, data) {
      if (self.destroyed) return
      if (err) return self.destroy(err)
      if (data === null) return self.push(null)
      self._reading = false
      if (self.push(data)) self._read(hwm)
    }
  }

  dwStreamWrapClass.prototype._from = read || noop
  dwStreamWrapClass.prototype._read = function(size) {
    if (this._reading || this.destroyed) return
    this._reading = true
    this._from(size, this._callback)
  }

  dwStreamWrapClass.prototype.destroy = function(err) {
    if (this.destroyed) return
    this.destroyed = true

    var self = this
    process.nextTick(function() {
      if (err) self.emit('error', err)
      self.emit('close')
    })
  }

  return dwStreamWrapClass
}

function obj(opts, read) {
  if (typeof opts === 'function' || Array.isArray(opts)) {
    read = opts
    opts = {}
  }

  opts = defaults(opts)
  opts.objectMode = true
  opts.highWaterMark = 16

  return dws2wrap(opts, read)
}

function noop () {}

function defaults(opts) {
  opts = opts || {}
  return opts
}
