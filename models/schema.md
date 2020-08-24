# Sample User Model (JSON):
```
    {
        "_id": ObjectId("2342345235"),
        "displayName": "Mork Hashimoto",
        "name": {
            "familyName": "Hashimoto",
            "givenName": "Mork"
        },
        "birthday": "0000-01-16",
        "gender": "male",
        "tags": [
            "plaxo guy"
        ],
        "emails": [
            {
            "value": "mhashimoto-04@plaxo.com",
            "type": "work",
            "primary": "true",
            "verified": true
            },
            {
            "value": "mhashimoto-04@plaxo.com",
            "type": "home"
            },
            {
            "value": "mhashimoto@plaxo.com",
            "type": "home"
            }
        ],
        "urls": [
            {
            "value": "http://www.seeyellow.com",
            "type": "work"
            },
            {
            "value": "http://www.angryalien.com",
            "type": "home"
            }
        ],
        "phoneNumbers": [
            {
            "value": "KLONDIKE5",
            "type": "work"
            },
            {
            "value": "650-123-4567",
            "type": "mobile"
            }
        ],
        "photos": [
            {
            "value": "http://sample.site.org/photos/12345.jpg",
            "type": "thumbnail"
            }
        ],
        "ims": [
            {
            "value": "plaxodev8",
            "type": "aim"
            }
        ],
        "addresses": [
            {
            "type": "home",
            "streetAddress": "742 Evergreen Terrace\nSuite 123",
            "locality": "Springfield",
            "region": "VT",
            "postalCode": "12345",
            "country": "USA",
            "formatted":
            "742 Evergreen Terrace\nSuite 123\nSpringfield, VT 12345 USA"
            }
        ],
        "organizations": [
            {
            "name": "Burns Worldwide",
            "title": "Head Bee Guy"
            }
        ],
        "accounts": [
            {
            "domain": "plaxo.com",
            "userid": "2706"
            }
        ],
        "roles": [],
        "verificationToken": "ombhe65mfv31c1ugk2xxchnwmq0weksv",
        "verified": true
    }
```
# Sample Shop Model (JSON): 
```
    {
        "_id": ObjectId("2342345235"),
        "owner": "",
        "name": "",
        "displayName": "",
        "description": "",
        "addresses": [
            {
                "streetAddress": "",
                "locality": "",
                "region": "",
                "postalCode": "",
                "country": ""
            }
        ],
        "phoneNumbers": [
            {
                "type": "",
                "value": ""
            }
        ],
        "catalogs": [""]
    }
```
# Sample Product Model (JSON):
```
    {
        "_id": ObjectId("2342345235"),
        "shop": "",
        "parentProduct": "",
        "name": "",
        "description": "",
        specifications: {

        },
        "quantity": 1234,
        "isSKU": true,
        "SKU": "",
        "price", 00.00,
        "currency": "",
        "images": [
            {
            "value": "http://sample.site.org/photos/12345.jpg",
            "type": "thumbnail"
            }
        ]
    }
```
# Sample Catalog Model (JSON):
```
    {
        "_id":, ObjectId("2342345235"),
        "name": "",
        "shop": "",
        "description": "",
        "products": [""]
    }
```

# Sample Currency Model (JSON):
```
    {
        "_id":, ObjectId("2342345235"),
        "code": "usd",
        "description": ""
        "exchangeRate": 1
    }
```

# Sample Order Model (JSON):
```
    {
        "_id":, ObjectId("2342345235"),
        "timestamp": Math.floor(Date.now() / 1000),
        "user": ""
        "items": [
            {
                "product": "xyz",
                "quantity": 1
            }
        ]
    }
```