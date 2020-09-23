const cfg = require('../configuration')
const user = require('./user')
const debug = cfg.env == 'development' ? true : false

module.exports = function ShoppingBag(shoppingBag){
    this.items = typeof(shoppingBag !== 'undefined') && shoppingBag && shoppingBag.items ? shoppingBag.items : {}
    this.totalQuantity = typeof (shoppingBag !== 'undefined') && shoppingBag && shoppingBag.totalQuantity ? shoppingBag.totalQuantity : 0
    this.totalPrice = typeof (shoppingBag !== 'undefined') && shoppingBag && shoppingBag.totalPrice ? shoppingBag.totalPrice : 0

    this.sum = function() {
        let qty = 0
        let price = 0
        for (const i of Object.keys(this.items)) {
            if(typeof(this.items[i].price) == 'number' && typeof(this.items[i].qty) == 'number') {
                qty += Number(this.items[i].qty)
                price += (Number(this.items[i].qty) * Number(this.items[i].price))
            }
        }
        this.totalPrice = price
        this.totalQuantity = qty
    }

    this.add = function(product,quantity) {
        if (product && product.hasOwnProperty('_id') && product.hasOwnProperty('price') && typeof (quantity) == 'number' && quantity > 0) {
            let item = this.items[product._id]
            if (!item) {
                item = this.items[product._id] = { displayName: product.displayName, image: Array.isArray(product.images) ? product.images[0] : undefined, qty: 0, price: Number(product.price) }
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
            if (await user.isValid(u)) {
                u.bag = {
                    items: this.items,
                    totalPrice: this.totalPrice,
                    totalQuantity: this.totalQuantity
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