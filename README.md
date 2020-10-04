# OppenShop
Marketplace platform providing a web app and api service to support commerce in goods and services between buyers and sellers across multiple vendors, payment and logistics providers.

## Dependencies

### Elasticsearch

#### Create Index

`cat ./es-products-index.json | curl -H 'Content-Type: application/json' -X PUT --data-binary @- 'http://localhost:9200/products-index?pretty'`
