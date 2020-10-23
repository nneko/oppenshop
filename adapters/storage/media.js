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
const path = require('path')
const fs = require('fs').promises
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
    } else if (file && typeof(file.storage) !== 'undefined' && (file.storage == 's3')) {
      return file.uri
    } else if (file && typeof (file.storage) !== 'undefined' && (file.storage == 'fs')) {
      return cfg.media_uri_path + file.path
    } else {
      return ''
    }

}

media.write = (file, dest, opts) => {
  if(debug) console.log(file)
  let blob = file && file.buffer ? (file.storage == 'db' && file.buffer.buffer ? file.buffer.buffer : file.buffer) : ''

  let storageType = file && file.storage ? file.storage : (cfg.media_datastore ? cfg.media_datastore : 'fs')

  if(typeof(dest) != 'string') {
    let err = new Error('Invalid media destination')
    err.name = 'MediaError'
    err.type = 'InvalidDestination'
    throw err
  }

  let dataLocation = cfg.media_dest ? cfg.media_dest : '/tmp'
  if(cfg.media_dest_type && cfg.media_dest_type == 'relative') {
    dataLocation = path.join(__dirname,'../..' + dataLocation + dest)
  } else {
    dataLocation = dest
  }

  return new Promise(async (resolve, reject) => {
    try {
      switch(storageType) {
        default:
          let dataDir = dataLocation.split('/').slice(0, -1).join('/')
          if(debug) console.log('Writing media to ' + dataDir)
          await fs.mkdir(dataDir,{recursive: true})
          let result = await fs.writeFile(dataLocation, blob, { encoding: opts && typeof (opts.encoding) == 'string' ? opts.encoding : 'utf-8', flag: opts && typeof (opts.flag) == 'string' ? opts.flag :'w'})

          let newF = {}
          newF.path = dest
          newF.storage = 'fs'
          if(file.originalname) newF.originalname = file.originalname
          if(file.fieldname) newF.fieldname = file.fieldname
          if(file.mimetype) newF.mimetype = file.mimetype

          resolve(newF)
          break;
      }
    } catch (e) {
      console.error('Media write operation failed due to error: ', e.message)
      console.error(e)
      reject(e)
    }
  })
}

module.exports = media
