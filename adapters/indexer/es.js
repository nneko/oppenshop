const cfg = require('../../configuration')
const { Client } = require('@elastic/elasticsearch')
const validator = require('../../utilities/validator')
const es_client = new Client({ node: cfg.indexerType == 'elasticsearch' && (validator.isNotNull(cfg.indexerProtocol) && validator.isNotNull(cfg.indexerHost) && validator.isNotNull(cfg.indexerPort)) ? cfg.indexerProtocol + '://' + cfg.indexerHost + ':' + cfg.indexerPort : 'http://localhost:9200' })
const debug = cfg.env == 'development' ? true : false

let es = {}

es.getClient = () => {
    return es_client
}

es.index = async (idx, val, ops) => {
    return await es_client.index({
        index: idx,
        refresh: true,
        body: val
    })
}

es.search = async (idx, qry, ops) => {
    return await es_client.search({
        index: idx,
        body: {
            query: qry
        }
    })
}

es.update = async (idx, id, doc, ops) => {
    return await es_client.update({
        id: id,
        index: idx,
        refresh: true,
        body: {
            doc: doc ? doc : {}
        }
    })
}

es.updateMatches = async (idx, qry, ops) => {
    let script = ''
    if(ops.hasOwnProperty('replacement-values')) {
        for (const k of Object.keys(ops['replacement-values'])) {
            script = (script == '' ? script : script + ' ') + 'ctx._source[' + "\"" + String(k) + "\"" + '] = ' +  JSON.stringify(String(ops['replacement-values'][k])) + ';'
        }
    } 

    let esReq = {
        index: idx,
        refresh: true,
        body: {
            script: {
                lang: 'painless',
                source: script
            },
            query: {
                term: qry
            }
        }
    }
    if(debug) {
        console.log('Submitting elasticsearch request: ')
        console.log(esReq)
    }
    return await es_client.updateByQuery(esReq)
}

es.delete = async (idx, id, ops) => {
    return await es_client.delete({
        id: id,
        index: idx,
        refresh: true
    })
}

es.deleteMatches = async (idx, qry, ops) => {
    return await es_client.deleteByQuery({
        index: idx,
        refresh: true,
        body: {
            query: {
                match: qry
            }
        }
    })
}

module.exports = es