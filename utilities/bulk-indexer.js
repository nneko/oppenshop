const cfg = require('../configuration')
const idx = cfg.indexerAdapter ? require('../adapters/indexer/' + cfg.indexerAdapter) : null
const user = require('../models/user')
const shop = require('../models/shop')
const product = require('../models/product')
const validator = require('./validator')