const _ = require('lodash');

// module variables
const config = require('./config.json');
const defaultConfig = config.development;
const environment = process.env.NODE_ENV || 'development';
const environmentConfig = config[environment];
const finalConfig = _.merge(defaultConfig, environmentConfig);

global.gConfig = finalConfig;

console.log(`global.gConfig: ${JSON.stringify(global.gConfig, undefined, global.gConfig.json_indentation)}`);

const {createContext, CryptoFactory, Signer} = require('sawtooth-sdk/signing')
const {createHash} = require('crypto')
const {protobuf} = require('sawtooth-sdk')
const cbor = require('cbor')
const payloadCls = require('../common/payload.js')
const uuidv1 = require('uuid/v1')


const context = createContext('secp256k1')
const {Secp256k1PrivateKey, Secp256k1PublicKey} = require('sawtooth-sdk/signing/secp256k1.js')
const privateKey = Secp256k1PrivateKey.fromHex(global.gConfig.private_key)
const signer = new Signer(context, privateKey)

console.log('signere pub key = ', signer.getPublicKey().asHex())
console.log('private key = ', privateKey.asHex())

let payload = new payloadCls(uuidv1())
const payloadBytes = cbor.encode(payload)
console.log(payload)
const transactionHeaderBytes = protobuf.TransactionHeader.encode({
      familyName: 'remotecompute',
      familyVersion: '1.0',
      inputs: [],
      outputs: [],
      signerPublicKey: global.gConfig.public_key,
      batcherPublicKey: global.gConfig.public_key,
      dependencies: [],
      payloadSha512: createHash('sha512').update(payloadBytes).digest('hex')
    }).finish()
console.log('headerbytes', transactionHeaderBytes)

const signature = signer.sign(transactionHeaderBytes)

const transaction = protobuf.Transaction.create({
    header: transactionHeaderBytes,
    headerSignature: signature,
    payload: payloadBytes
})

console.log('txn = ', transaction)

const transactions = [transaction]

const batchHeaderBytes = protobuf.BatchHeader.encode({
    signerPublicKey: signer.getPublicKey().asHex(),
    transactionIds: transactions.map((txn) => txn.headerSignature),
}).finish()

const batchSignature = signer.sign(batchHeaderBytes)

const batch = protobuf.Batch.create({
    header: batchHeaderBytes,
    headerSignature: batchSignature,
    transactions: transactions,
    trace:true
})

const batchListBytes = protobuf.BatchList.encode({
    batches: [batch]
}).finish()

const request = require('request')

console.log('batch bytes ', batchListBytes)

request.post({
    url: global.gConfig.validator_rest_url + "batches",
    body: batchListBytes,
    headers: {'Content-Type': 'application/octet-stream'}
}, (err, response) => {
    if (err) return console.log("error occured", err)
    console.log(response.body)
})
