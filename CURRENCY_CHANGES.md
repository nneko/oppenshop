# OppenShop - MultiCurrency Functionality

Transition from mainly single currency (string) to multiple currency (object)

## Collection

Create collection on db named 'currencies'

### Populate Currencies

Populate currencies with initial currency data

```
{"_id":{"$oid":"5f81fd486a450c4eaeec79f7"},"code":"USD","symbol":"$","status":"active","description":"United States Dollar"}
```

```
{"_id":{"$oid":"5f81fce16a450c4eaeec79f6"},"code":"JMD","symbol":"$","status":"active","description":"Jamaican Dollar"}
```

### Migrate products

To update existing records in 'products' collection to reference the currency collection by set new field 'currencyid'

Note the below commands only update one row at a time, so it will have to be executed multiple times until it returns NULL

#### USD

```
db.products.findAndModify({
    query: { currency: "usd" },
    update: { $set: { currencyid: "5f81fd486a450c4eaeec79f7" }, $unset: { currency: ""} },
    new:true
})
```

### JMD

```
db.products.findAndModify({
    query: { currency: "jmd" },
    update: { $set: { currencyid: "5f81fce16a450c4eaeec79f6" }, $unset: { currency: ""}},
    new:true
})
```
