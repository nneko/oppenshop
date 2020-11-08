# OppenShop - MultiCurrency Functionality

Transition from mainly single currency (string) to multiple currency (object)

## Configuration the applications Foreign Exchange

The application will store either manually set exchange rate (FX) data or can automatically populate the exchange rate tables using data provided by https://openexchangerates.org/ using a valid API key.

The following variable should be set in each environment using the `configuration/index.js` file.

```
  fxBase: 'USD',
  fxBaseRates: {
    'USD': 1,
    'GBP': 0.76,
    'JMD': 148.4647,
    'EUR': 0.84,
    'CAD': 1.30
  },
  fxSource: 'openexchangerates.org',
  openExchangeRatesAppID: '<openexchangerates.org api key>'
```

Note, to manually set the exchange rates used by the application set the `fxSource` value to any except `openexchangerates.org` and provide required dictionary to `fxBaseRates`.

When setting the exchange rates ensure that the *fxBaseRates* has an entry for each currency in the currencies collection in addition to an entry for the `fxBase`.

## Collection

Create collection on db named 'currencies' to store details on currencies accepted for transactions.

```
db.createCollection('currencies')
```

### Populate Currencies collection

Populate currencies collection with initial data for each accepted currency.

```
db.currencies.insert({"code":"USD","symbol":"$","status":"active","description":"United States Dollar"})
```

```
db.currencies.insert({"code":"JMD","symbol":"$","status":"active","description":"Jamaican Dollar"})
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

```
db.products.findAndModify({
    query: { currency: "usd" },
    update: { $set: { currency: <id> }},
    new:true
})
```
