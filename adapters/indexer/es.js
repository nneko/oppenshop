const cfg = require('../../configuration')
const { Client } = require('@elastic/elasticsearch')
const validator = require('../../utilities/validator')
const es_client = new Client({ node: cfg.indexerType == 'elasticsearch' && (validator.isNotNull(cfg.indexerProtocol) && validator.isNotNull(cfg.indexerHost) && validator.isNotNull(cfg.indexerPort))? cfg.indexerProtocol + '://' + cfg.indexerHost + ':' + cfg.indexerPort : 'http://localhost:9200'})

let es = {}

es.getClient = () => {
    return es_client
}

es.index = async (idx, val, ops) => {
    return await es_client.index({
        index: idx,
        body: val
    })
}

es.search = async (idx, qry, ops) => {
    return await es_client.search({
        index: idx,
        body: {
            query: {
                match: qry
            }
        }
    })
}

module.exports = es