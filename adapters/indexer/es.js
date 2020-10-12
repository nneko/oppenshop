const cfg = require('../../configuration')
const { Client } = require('@elastic/elasticsearch')
const validator = require('../../utilities/validator')
const es_client = new Client({ node: cfg.indexerType == 'elasticsearch' && (validator.isNotNull(cfg.indexerProtocol) && validator.isNotNull(cfg.indexerHost) && validator.isNotNull(cfg.indexerPort)) ? cfg.indexerProtocol + '://' + cfg.indexerHost + ':' + cfg.indexerPort : 'http://localhost:9200' })
const debug = cfg.env == 'development' ? true : false

let es = {}

function painlessEscape(str) {
    return (str + '').replace(/[\\"']/g, '\\$&').replace(/\u0000/g, '\\0');
}

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
    let params = {}
    if(ops.hasOwnProperty('replacement-values')) {
        for (const k of Object.keys(ops['replacement-values'])) {
            if (typeof(ops['replacement-values'][k]) == 'object') {
                console.log('Converting object to param for indexer query')
                params[k] = {}
                for (const s of Object.keys(ops['replacement-values'][k])) {
                    params[k][s.toString()] = String(ops['replacement-values'][k][s])
                }
            }

            let assignToParams = "ctx._source['" + String(k) + "'] = params['" + String(k) + "'];"

            script = (script == '' ? script : script + ' ') + ((typeof (ops['replacement-values'][k]) == 'object') ? assignToParams : 'ctx._source[' + "\"" + String(k) + "\"" + '] = "' + painlessEscape(String(ops['replacement-values'][k])) + '";')
        }
    } 

    let esReq = {
        index: idx,
        refresh: true,
        body: {
            script: {
                lang: 'painless',
                source: script,
                params: params
            },
            query: {
                term: qry
            }
        }
    }
    if(debug) {
        console.log('Submitting elasticsearch request: ')
        console.log(esReq)
        console.log("params: ")
        console.log(params)
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
                match: qry
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