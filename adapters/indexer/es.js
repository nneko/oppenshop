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

es.update = async (idx, id, doc, ops) => {
    return await es_client.update({
        id: id,
        index: idx,
        body: {
            doc: doc ? doc : {}
        }
    })
}

es.updateMatches = async (idx, qry, ops) => {
    let script = ''
    if(ops.hasOwnProperty('replacement-values')) {
        for (const k of Object.keys(ops['replacement-values'])) {
            script = script + 'ctx.source.' + String(k) + '= ' + String(ops['replacement-values'][k]) + ';'
        }
    }
    return await es_client.updateByQuery({
        index: idx,
        body: {
            script: {
                inline: script,
                lang: 'painless'
            },
            query: {
                terms: qry
            }
        }
    })
}

es.delete = async (idx, id, ops) => {
    return await es_client.delete({
        id: id,
        index: idx
    })
}

es.deleteMatches = async (idx, qry, ops) => {
    return await es_client.deleteByQuery({
        index: idx,
        body: {
            query: {
                match: qry
            }
        }
    })
}

module.exports = es