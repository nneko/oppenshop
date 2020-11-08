const cfg = require('../configuration')
const user = require('./user')
const currency = require('./currency')
const fx = require('./fx')
const product = require('./product')
const debug = cfg.env == 'development' ? true : false

module.exports = function ShoppingBag(shoppingBag, baseCurrency){

    if (!currency.isValid(baseCurrency)) {
        let err = new Error('Cannot create a shopping bag without setting the base currency')
        err.name = 'ShoppingBagError'
        err.type = 'Invalid Base Currency'
        throw err
    }

    this.currency = baseCurrency
    this.items = typeof(shoppingBag !== 'undefined') && shoppingBag && shoppingBag.items ? shoppingBag.items : {}
    this.totalQuantity = typeof (shoppingBag !== 'undefined') && shoppingBag && shoppingBag.totalQuantity ? shoppingBag.totalQuantity : 0
    this.totalPrice = typeof (shoppingBag !== 'undefined') && shoppingBag && shoppingBag.totalPrice && shoppingBag.currency == this.currency.code ? shoppingBag.totalPrice : 0

    this.getCurrency = () => {
        return this.currency
    }

    this.setCurrency = async (currency_code) => {
        try {
            this.currency = await currency.read({
                code: (currency_code && typeof(currency_code) == 'string' ? currency_code : cfg.base_currency_code)
            }, { limit: 1 })
            if (! currency.isValid(this.currency)) {
                let err = new Error('Invalid Base Currency')
                err.name = 'CurrencyError'
                err.type = 'Invalid Base Currency'
                throw err
            }
            await this.sum()
        } catch (e) {
            if (debug && e) {
                console.error(e.stack)
            }
            throw e
        }
    }

    this.productIsValid = (p) => {
        return new Promise(async (resolve, reject) => {
            try {
                resolve(await product.isValid(p))
            } catch (e) {
                reject(e)
            }
        })
    }

    this.sum = () => {
        return new Promise(async (resolve, reject) => {
            try {
                let qty = 0
                let price = 0

                let fxRates = await fx.read({ source: cfg.fxSource }, { limit: 1 })

                if (!fx.isValid(fxRates)) {
                    let fxError = new Error('Invalid FX Rates')
                    fxError.type = 'Invalid'
                    fxError.name = 'fxError'
                    throw fxError
                }

                for (const i of Object.keys(this.items)) {
                    if (typeof (this.items[i] && this.items[i].qty) == 'number') {
                        let prod = await product.read(i, {findBy: 'id'})
                        if(! await product.isValid(prod)) {
                            console.log('Skipping sum on invalid product: ' + String(i) + ' in shopping bag.')
                            console.log('Deleting invalid product from shopping bag')
                            delete this.items[i]
                            continue
                        }
                        let productCurrency = await currency.read(prod.currency, { findBy: 'id' })

                        let itemCurrencyCode = cfg.base_currency_code

                        if (currency.isValid(productCurrency)) {
                            itemCurrencyCode = String(productCurrency.code)
                        }

                        if (!itemCurrencyCode) itemCurrencyCode = fxRates.exchangeBase

                        qty += Number(this.items[i].qty)
                        if(typeof(fxRates.exchangeRates[itemCurrencyCode]) === 'undefined' || typeof(fxRates.exchangeRates[itemCurrencyCode]) !== 'number') {
                            let fxError = new Error('No matching conversion rate')
                            fxError.name = 'fxError'
                            fxError.type = 'Conversion'
                            throw fxError
                        }
                        let currencyExchangeRate = Number(fxRates.exchangeRates[itemCurrencyCode])

                        if (isNaN(currencyExchangeRate)) {
                            console.error('Unable to do currency conversion for product: ')
                            console.error(i)
                            continue
                        }

                        price += (Number(this.items[i].qty) * (prod.price / currencyExchangeRate))
                    }
                }
                let cp = price
                if (this.currency.code == fxRates.exchangeBase) {
                    cp = price
                } else {
                    if (typeof (fxRates.exchangeRates[this.currency.code]) === 'undefined' || typeof (fxRates.exchangeRates[this.currency.code]) !== 'number') {
                        let fxError = new Error('No matching conversion rate')
                        fxError.name = 'fxError'
                        fxError.type = 'Conversion'
                        throw fxError
                    }
                    cp = cp * Number(fxRates.exchangeRates[this.currency.code])
                }
                this.totalPrice = cp
                this.totalQuantity = qty
                resolve()
            } catch (e) {
                reject(e)
            }
        })
    }

    this.add = async function(product,quantity) {
        if (product && product.hasOwnProperty('_id') && product.hasOwnProperty('price') && product.hasOwnProperty('currency') && typeof (quantity) == 'number' && quantity > 0) {
            let item = this.items[product._id]
            if (!item) {
                item = this.items[product._id] = {
                    qty: quantity
                }
            }
            else {
                item.qty += Number(quantity)
            }
            this.items[product._id] = item
            await this.sum()
        } else {
            if (!(product && product.hasOwnProperty('_id') && product.hasOwnProperty('price'))) {
                let e = new Error('Invalid item')
                e.name = 'ShoppingBagError'
                e.type = 'InvalidItem'
                throw e
                
            } else {
                let e = new Error('Invalid quantity')
                e.name = 'ShoppingBagError'
                e.type = 'InvalidQuantity'
                throw e

            }
        }
    }

    this.remove = async (product, quantity) => {
        if (product && product.hasOwnProperty('_id') && product.hasOwnProperty('price') && typeof(quantity) == 'number' && quantity >= 0) {
            let item = this.items[product._id]
            if (!item) {
                let e = new Error("Item doesn't exist")
                e.name = 'ShoppingBagError'
                e.type = 'InvalidItem'
                throw e
            }
            if (item.qty <= Number(quantity)) {
                item.qty = 0
            } else {
                item.qty -= Number(quantity)
            }
            if (item.qty <= 0) {
                delete this.items[product._id]
            } else {
                this.items[product._id] = item
            }
            await this.sum()
        } else {
            if (!(product && product.hasOwnProperty('_id') && product.hasOwnProperty('price'))) {
                let e = new Error('Invalid item')
                e.name = 'ShoppingBagError'
                e.type = 'InvalidItem'
                throw e

            } else {
                let e = new Error('Invalid quantity')
                e.name = 'ShoppingBagError'
                e.type = 'InvalidQuantity'
                throw e

            }
        }
    }

    this.delete = async (product) => {
        let item = this.items[product._id]
        if (!item) {
            let e = new Error("Item doesn't exist")
            e.name = 'ShoppingBagError'
            e.type = 'InvalidItem'
            throw e
        }
        await this.remove(product, item.qty)
    }

    this.total = () => {
        return this.totalPrice
    }

    this.quantity = () => {
        return this.totalQuantity
    }

    this.save = async (u) => {
        try {
            if (user.isValid(u)) {
                u.bag = {
                    items: this.items,
                    totalPrice: this.totalPrice,
                    totalQuantity: this.totalQuantity,
                    currency: this.currency.code
                }

                return await user.update({_id: u._id},u)
            }
        } catch (e) {
            if(debug && e) {
                console.error(e.stack)
            }
        }
    }

    this.sum().then(r => {

    }).catch(e => {
        throw e
    })
}