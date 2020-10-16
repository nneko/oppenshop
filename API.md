# OppenShop - APIs

## Endpoints

The application provides a RESTful API with endpoints accessible at /api/*

### /find

Retrieve a specific shop/product/catalog entry or alternatively search for shop/product/catalogs matching or related to the query.

eg.)

```
{
	"query": {
		"match": {
			"name": {
				"query": "xbox"
			}
		}
	}
}
```

```
curl -H 'Content-Type: application/json' -X POST 'http://localhost:3000/api/find' -d '{"query": {"match": {"name": "XBox"}}}'
```

### /get/shops

Retrieve list of shops associated with UserID (with activate SessionID)

```
curl -H 'Content-Type: application/json' -X GET 'http://localhost:3005/api/get/shops?sid=xxxxxxxxxxxxxx&uid=xxxxxxxxxxxxxxxxxx'
```

Optional Params:
- status (active/inactive)
- page (1,2,3,4,5,etc..)


### /get/products

Retrieve list of products associated with UserID (with activate SessionID)

```
curl -H 'Content-Type: application/json' -X GET 'http://localhost:3005/api/get/products?sid=xxxxxxxxxxxxxx&uid=xxxxxxxxxxxxxxxxxx'
```

Optional Params:
- status (active/inactive)
- page (1,2,3,4,5,etc..)
- shop (ShopID)
