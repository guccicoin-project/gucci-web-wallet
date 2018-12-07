const TurtleCoind = require('turtlecoin-rpc').TurtleCoind;
const TurtleService = require('turtlecoin-rpc').TurtleService;
const Client = require('turtlecoin-rpc').Client;

const daemon = new TurtleCoind({
    host: 'node1.guccicoin.cf', // ip address or hostname of the TurtleCoind host
    port: 10181, // what port is the RPC server running on
    timeout: 2000, // request timeout
    ssl: false // whether we need to connect using SSL/TLS
});

const service = new TurtleService({
    host: 'node1.guccicoin.cf', // ip address or hostname of the turtle-service host
    port: 10191, // what port is turtle-service running on
    timeout: 2000, // request timeout
    ssl: false, // whether we need to connect using SSL/TLS
    rpcPassword: 'changeme', // must be set to the password used to run turtle-service
   
    // RPC API default values
    defaultMixin: false, // the default mixin to use for transactions, the default setting is false which means we don't have a default value
    defaultFee: 0.1, // the default transaction fee for transactions
    defaultBlockCount: 1, // the default number of blocks when blockCount is required
    decimalDivisor: 100, // Currency has many decimal places?
    defaultFirstBlockIndex: 1, // the default first block index we will use when it is required
    defaultUnlockTime: 0, // the default unlockTime for transactions
    defaultFusionThreshold: 10000000, // the default fusionThreshold for fusion transactions
});

const client = new Client({
    host: 'node1.guccicoin.cf', // ip address or hostname of the TurtleCoind host
    port: 10181, // what port is the RPC server running on
    timeout: 2000, // request timeout
    ssl: false // whether we need to connect using SSL/TLS
});

service.createAddress().then((result) => {
    console.log(result);
})