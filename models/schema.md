Currency:
Fields - id, code

Product:
Fields - _id, shop, parentProduct, name, description, specifications, isSKU, SKU, price, currency, image

Catalog:
Fields - _id, name, description, productListing: []

Order:
Fields - _id, timestamp, user, product, quantity

Shop:
Fields - _id, owner, name, displayName, description, address: {streetAddress, locality, region, postalCode, country}, phoneNumber: {value,type}