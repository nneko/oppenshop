# OppenShop - MultiCurrency Functionality

Transition from mainly single currency (string) to multiple currency (object)

## Collection

Create collection on db named 'currencies'

```
db.createCollection('currencies')
```

### Populate Currencies

Populate currencies with initial currency data

```
db.currencies.insert{"code":"USD","symbol":"$","status":"active","description":"United States Dollar"}
```

```
db.currencies.insert{"code":"JMD","symbol":"$","status":"active","description":"Jamaican Dollar"}
```

### View Currencies

```
db.currencies.find({})
```

### Bulk convert legacy product definitions

To update existing records in 'products' collection stored in the legacy format to reference the new currency collection perform the following steps:

1. Set the `base_currency_code` in the master configuration for the environment to be one of the new supported currency codes

```
base_currency_code: 'JMD'
```

2. Execute the `bulk-currency-converter.js` utility to set products 'currency' field.

```
node ./utilities/bulk-currency-converter.js
```

#### Convert a single legacy formatted product record in the database

List all the currencies and their associated database IDs and currency codes.

```
db.currencies.find({},{_id: 1, code: 1})
```

Copy the ID string and update the chosen product record that matches the query

db.products.findAndModify({
    query: { currency: "usd" },
    update: { $set: { currency: <id> }},
    new:true
})
```
