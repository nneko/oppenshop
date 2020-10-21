const cfg = require('../../configuration')
const btoa = require('btoa')
const mediaManager = require('multer')
const datastore = cfg.uploadToMemory ? mediaManager.memoryStorage() : mediaManager.diskStorage()
const dataUploader = mediaManager({
  storage: datastore,
  onError: function (err, next) {
    console.log('Data Upload Error', err)
    next(err)
  }
})

const debug = cfg.env == 'development' ? true : false

let media = {}

media.uploader = (fields) => {
  return (fields && Array.isArray(fields)) ? dataUploader.fields(fields) : dataUploader.array('fullimage', cfg.uploadLimit ? cfg.uploadLimit : 10)
}

media.read = (file) => {
    let blob = file && file.buffer && typeof(file.buffer.buffer) !== 'undefined' ? file.buffer.buffer : (file.buffer ? Buffer.from(file.buffer,'base64') : '')

    if (file && typeof(file.storage) !== 'undefined' && file.storage == 'db') {
      let base64string = btoa([].reduce.call(new Uint8Array(blob),function(p,c){return p+String.fromCharCode(c)},''))
      return 'data:'+file.mimetype+';base64,'+base64string
    } else if (file && typeof(file.storage) !== 'undefined' && (file.storage == 's3' || file.storage == 'fs')) {
      return file.uri
    } else {
      return ''
    }

}

media.write = (file, dest) => {

}

module.exports = media
