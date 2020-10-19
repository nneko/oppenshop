const cfg = require('../configuration')
const user = require('./user')
const currency = require('./currency')
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
            this.sum()
        } catch (e) {
            if (debug && e) {
                console.error(e.stack)
            }
            throw e
        }
    }

    this.sum = function() {
        let qty = 0
        let price = 0
        for (const i of Object.keys(this.items)) {
            if(typeof(this.items[i].price) == 'number' && typeof(this.items[i].qty) == 'number') {
                if(!this.items[i].currency) this.items[i].currency = this.currency.exchangeBase
                qty += Number(this.items[i].qty)
                let currencyExchangeRate = this.currency.exchangeRates[this.currency.code]

                let cp = this.items[i].price

                if(!isNaN(this.currency.exchangeRates[this.items[i].currency])) {
                    if(this.currency.code != this.items[i].currency) {
                        cp = this.items[i].price * Number(this.currency.exchangeRates[this.items[i].currency])
                    } else {
                        cp = this.items[i].price / Number(this.currency.exchangeRates[this.items[i].currency])
                    }
                } else {
                    console.error('Unable to do currency conversion for product: ')
                    console.error(this.items[i])
                    continue
                }

                let productPriceInBase = cp

                price += (Number(this.items[i].qty) * (currencyExchangeRate * productPriceInBase))
            }
        }
        this.totalPrice = price
        this.totalQuantity = qty
    }

    this.add = async function(product,quantity) {
        if (product && product.hasOwnProperty('_id') && product.hasOwnProperty('price') && typeof (quantity) == 'number' && quantity > 0) {
            let item = this.items[product._id]
            if (!item) {
                item = this.items[product._id] = {
                    displayName: product.displayName, 
                    image: Array.isArray(product.images) ? product.images[0] : undefined,
                    qty: 0,
                    price: Number(product.price) 
                }

                let productCurrency = await currency.read(product.currency,{findBy: 'id'})

                if(currency.isValid(productCurrency)) {
                    item.currency = String(productCurrency.code)
                } else {
                    item.currency = cfg.base_currency_code
                }
            }
            item.qty += Number(quantity)
            this.items[product._id] = item
            this.sum()
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

    this.remove = function(product, quantity) {
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
            this.sum()
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

    this.delete = function(product) {
        let item = this.items[product._id]
        if (!item) {
            let e = new Error("Item doesn't exist")
            e.name = 'ShoppingBagError'
            e.type = 'InvalidItem'
            throw e
        }
        this.remove(product, item.qty)
    }

    this.total = function() {
        return this.totalPrice
    }

    this.quantity = function() {
        return this.totalQuantity
    }

    this.save = async function(u) {
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

    this.sum()
}