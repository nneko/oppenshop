/*
* Sample Configuration File for the OppenShop Server
*/

let environment = {};

environment.development = {
   env: 'development',
   title: 'OppenShop',
   port: 3000,
   template: 'default',
   database: 'oppenshop',
   dbHost: 'localhost',
   dbPort: 27017,
   dbType: 'mongodb',
   httpPort: 3000,
   httpsPort: 3001,
   httpsKey: 'configuration/key.pem',
   httpsCert: 'configuration/cert.pem',
   secret: 'xxxxxxx',
   accessTokenSecret: 'xxxxxxxxxx',
   refreshTokenSecret: 'xxxxxxxxxxx',
   mailgunDomain: 'xxxxxxxxx',
   mailgunPassword: 'xxxxxxxx',
   tokenTTL: 3600000,
   sessionTTL: 1209600,//14 * 24 * 60 * 60
   endpoint: 'http://localhost:3000/',
   mailRelay: 'xxxxxxxx',
   mailAPI: '/v3/<domain>/messages',
   mailUser: 'api',
   mailRelayPassword: 'xxxxxxxx',
   mailDomain: 'xxxxxxxx',
   mailSender: 'sender@xxxxxxxx.xxx',
   verifyUsers: false
};

// Determine which environment was passed as a command-line argument
let currentEnvironment = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase() : '';

// Check that the current environment is one of the environments above, if not default to development
let environmentToExport = typeof(environment[currentEnvironment]) == 'object' ? environment[currentEnvironment] : environment.development;

// Export the module
module.exports = environmentToExport;