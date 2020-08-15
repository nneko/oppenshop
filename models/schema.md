Currency:
Fields - id, code

Product:
Fields - _id, shopID, parentProductID, productName, description, specifications, isSKU, SKU, price, currency, productImage

Catalog:
Fields - _id, name, description, productListing: []

Order:
Fields - _id, timestamp, userID, productId, quantity

Shop:
Fields - _id, ownerID, name, description, address: {streetAddress, locality, region, postalCode, country}, phoneNumber: {value,type}