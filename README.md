# OppenShop
Marketplace platform providing a web app and api service to support commerce in goods and services between buyers and sellers across multiple vendors, payment and logistics providers.

## Dependencies

### Elasticsearch

#### Create Index

```
cat ./configuration/es-products-index.json | curl -H 'Content-Type: application/json' -X PUT --data-binary @- 'http://localhost:9200/products-index?pretty'
```

## API

### Endpoints

The application provides a RESTful API with endpoints accessible at /api/*

#### /find

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