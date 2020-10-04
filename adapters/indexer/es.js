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
    let esReq = {
        index: idx,
        refresh: true,
        body: val
    }
    if (validator.isNotNull(ops)) {
        for (const o of Object.keys(ops)) {
            switch (o) {
                case 'queryOptions':
                    if (validator.isNotNull(ops[o])) {
                        for (const k of Object.keys(ops[o])) {
                            esReq[k] = ops[o][k]
                        }
                    }
                    break
            }
        }
    }
    return await es_client.index(esReq)
}

es.search = async (idx, qry, ops) => {
    let esReq = {
        index: idx,
        body: {
            query: qry
        }
    }
    if (validator.isNotNull(ops)) {
        for (const o of Object.keys(ops)) {
            switch (o) {
                case 'queryOptions':
                    if (validator.isNotNull(ops[o])) {
                        for (const k of Object.keys(ops[o])) {
                            esReq[k] = ops[o][k]
                        }
                    }
                    break
            }
        }
    }
    return await es_client.search(esReq)
}

es.update = async (idx, id, doc, ops) => {
    let esReq = {
        id: id,
        index: idx,
        refresh: true,
        body: {
            doc: doc ? doc : {}
        }
    }
    if (validator.isNotNull(ops)) {
        for (const o of Object.keys(ops)) {
            switch (o) {
                case 'queryOptions':
                    if (validator.isNotNull(ops[o])) {
                        for (const k of Object.keys(ops[o])) {
                            esReq[k] = ops[o][k]
                        }
                    }
                    break
            }
        }
    }
    return await es_client.update(esReq)
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
    if (validator.isNotNull(ops)) {
        for (const o of Object.keys(ops)) {
            switch (o) {
                case 'queryOptions':
                    if (validator.isNotNull(ops[o])) {
                        for (const k of Object.keys(ops[o])) {
                            esReq[k] = ops[o][k]
                        }
                    }
                    break
            }
        }
    }
    return await es_client.updateByQuery(esReq)
}

es.delete = async (idx, id, ops) => {
    let esReq = {
        id: id,
        index: idx,
        refresh: true
    }
    if (validator.isNotNull(ops)) {
        for (const o of Object.keys(ops)) {
            switch (o) {
                case 'queryOptions':
                    if (validator.isNotNull(ops[o])) {
                        for (const k of Object.keys(ops[o])) {
                            esReq[k] = ops[o][k]
                        }
                    }
                    break
            }
        }
    }
    return await es_client.delete(esReq)
}

es.deleteMatches = async (idx, qry, ops) => {
    let esReq = {
        index: idx,
        refresh: true,
        body: {
            query: {
                term: qry
            }
        }
    }
    if (validator.isNotNull(ops)) {
        for (const o of Object.keys(ops)) {
            switch (o) {
                case 'queryOptions':
                    if (validator.isNotNull(ops[o])) {
                        for (const k of Object.keys(ops[o])) {
                            esReq[k] = ops[o][k]
                        }
                    }
                    break
            }
        }
    }
    return await es_client.deleteByQuery(esReq)
}

module.exports = es