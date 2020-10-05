const cfg = require('../../../configuration/index.js')
const validator = require('../../../utilities/validator')
const idx = cfg.indexerAdapter ? require('../../../adapters/indexer/' + cfg.indexerAdapter) : null
const pIdx = cfg.indexerProductIndex ? cfg.indexerProductIndex : 'products-index'
const debug = cfg.env == 'development' ? true : false

let finder = {}

finder.query = async (q,o) => {
    if (debug) {
        console.log('Submitting query to indexer')
        console.log('query: ')
        console.log(q)
        console.log('query options: ')
        console.log(o)
    }

    let results = []

    try {
        let searchResult = await idx.search(pIdx, q, o)

        if (debug) {
            console.log('Response received from indexer')
            console.log('result: ')
            console.log(searchResult)
        }

        if (searchResult && searchResult.body && searchResult.body.hits && searchResult.body.hits.hits && Array.isArray(searchResult.body.hits.hits) && searchResult.body.hits.hits.length > 0) {
            for (const r of searchResult.body.hits.hits) {
                if (r && validator.isNotNull(r["_source"])) results.push(r["_source"])
            }
        } 
    } catch (e) {
        if(debug) {
            console.error('Error encountered request to indexer')
            console.error(e)
            if(e.stack) console.error(e.stack)
        }
        throw e
    }

    return results
}

module.exports = finder