const cfg = require('../../configuration')
const btoa = require('btoa')
const debug = cfg.env == 'development' ? true : false

let media = {}

media.getBinaryDetails = (file) => {
    //console.log(typeof(file))
    //console.log(typeof(file.buffer))
    //console.log(typeof(file.buffer.buffer))

    if (typeof(file.storage) !== 'undefined' && file.storage == 'db') {
      var base64string = btoa([].reduce.call(new Uint8Array(file.buffer.buffer),function(p,c){return p+String.fromCharCode(c)},''))
      return 'data:'+file.mimetype+';base64,'+base64string
    } else if (typeof(file.storage) !== 'undefined' && file.storage == 's3') {
      return file.uri
    } else {
      var base64string = btoa([].reduce.call(new Uint8Array(file.buffer.buffer),function(p,c){return p+String.fromCharCode(c)},''))
      return 'data:'+file.mimetype+';base64,'+base64string
    }

}

module.exports = media
