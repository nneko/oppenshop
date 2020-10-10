# OppenShop
Marketplace platform providing a web app and api service to support commerce in goods and services between buyers and sellers across multiple vendors, payment and logistics providers.

## Dependencies

### Node.js

The platform is comprised of a document database, search engine, application server, web application and API. The server side application runs on top of the node.js platform. Download and install the latest LTS (Long Term Support) version of [Node.js Download](https://nodejs.org/en/download/). The minimum supported version is v12.18.3.

Install the oppenshop node module dependencies. 

```
npm i
```

### mongoDB.

Data collections are stored in a document database by the application server. The default supported document database is mongoDB. However, alternate databases may utilized by configuring a supported adapter.

To install mongoDB follow the [mongo documentation](https://docs.mongodb.com/guides/server/install/). Post database installation peform these additional steps to configure user authentication and a replica set.

#### Enable authentication

Add the security block to the mongod.conf.

```
security:
    authorization: enabled
```

#### Create a user and role for OppenShop

Assign the `readWrite` privileges to the application user on the specified database.

```
use admin
db.createUser({user: <username>, pwd: passwordPrompt(), roles: [ role: <role>, db: <db>] }
```

#### Setup Replication

Add the following lines to the mongodb.conf 

```
replication:
   replSetName: "rs0"
```

Login to the database with the right privileges and initiate the replicates

```
rs.initiate()
```

Start/Stop/Restart Database

```
brew services start/restart/stop mongodb-community
```

### Elasticsearch

#### Installation

##### Mac

Homebrew configuration, setup and installation

```
brew tap elastic/tap
```

```
brew install elastic/tap/elasticsearch-full
```

Launch/Start elasticsearch

```
brew services start elastic/tap/elasticsearch-full
```

MongoDB user creation for elasticsearch

```
db.createUser({user: 'es', pwd: passwordPrompt(),roles: [{role: 'read', db: 'oppenshop'}]})
```

#### Linux

Download the Elasticsearch archive for your OS:

```
curl -L -O https://artifacts.elastic.co/downloads/elasticsearch/elasticsearch-7.9.2-linux-x86_64.tar.gz
```

Extract the archive:

```
tar -xvf elasticsearch-7.9.2-linux-x86_64.tar.gz
```

Start Elasticsearch from the bin directory:

```
cd elasticsearch-7.9.2/bin
./elasticsearch
```

[Optional] Start two more instances of Elasticsearch so you can see how a typical multi-node cluster behaves. You need to specify unique data and log paths for each node.

```
./elasticsearch -Epath.data=data2 -Epath.logs=log2
./elasticsearch -Epath.data=data3 -Epath.logs=log3
```

More details available at https://www.elastic.co/guide/en/elasticsearch/reference/current/getting-started-install.html


#### Create Index

Create an index file with  filters and analyzers for the collections in Mongodb database as well as mappings for the relevant fields

```
cat ./configuration/es-products-index.json | curl -H 'Content-Type: application/json' -X PUT --data-binary @- 'http://localhost:9200/products-index?pretty'
```

Expected JSON response should include:  

```
{"acknowledged" : true}
```

### Bulk Indexer with NodeJS

Verify the configuration file has the correct details in configuration/index.js, specifically the following config:

```
indexerAdapter: 'es',
indexerType: 'elasticsearch',
indexerHost: 'localhost',
indexerPort: '9200',
indexerProtocol: 'http',
indexerAuth: 'basic',
indexerUser: '',
indexerPassword: '',
```

### Test & Verification

#### Test

You can test that your Elasticsearch node is running by sending an HTTP request

```
curl -H 'Content-Type: application/json' -X GET 'http://localhost:9200/'
```

```
curl -H 'Content-Type: application/json' -X GET 'http://localhost:9200/_cat/health?v'
```

#### Verification

Calling elasticsearch endpoint directly can be done with the following parameters by:

```
curl -H 'Content-Type: application/json' -X POST 'http://localhost:9200/products-index/_search?pretty' -d '{"query": {"match": {"name": "XBox"}}}'
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
