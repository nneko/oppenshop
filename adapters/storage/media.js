const cfg = require('../../configuration')
const btoa = require('btoa')
const debug = cfg.env == 'development' ? true : false

let media = {}

media.getBinaryDetails = (file) => {
    console.log(typeof(file))
    console.log(typeof(file.buffer))
    console.log(typeof(file.buffer.buffer))

    let imageStringBlob = file && file.buffer && typeof(file.buffer.buffer) !== 'undefined' ? file.buffer.buffer : (file.buffer ? Buffer.from(file.buffer,'base64') : '')

    if(debug) console.log(imageStringBlob)

    if (typeof(file.storage) !== 'undefined' && file.storage == 'db') {
      let base64string = btoa([].reduce.call(new Uint8Array(imageStringBlob),function(p,c){return p+String.fromCharCode(c)},''))
      return 'data:'+file.mimetype+';base64,'+base64string
    } else if (typeof(file.storage) !== 'undefined' && file.storage == 's3') {
      return file.uri
    } else {
      return ''
    }

}

module.exports = media
