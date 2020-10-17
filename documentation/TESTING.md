# OppenShop - Test Cases

Testing of Oppenshop use cases

## Setup

NodeJS testing facilitated by Jest

```
npm install --save-dev jest
```

## Configuration

Test environment variables would be configured in:

```
tests/jest.config.js
```

### Configuration - MemoryMongoDBServer

Installation of the Memory MongoDB Server

```
npm i mongodb-memory-server
```

Test environment variables would be configured in:

```
tests/memory_mongodb_server_model.js
```

## Executing Tests

### All

```
npm test --
```

### Specific Tests

```
npm test -- {name_of_test_file}
```
