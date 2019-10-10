const _ = require('lodash');

// module variables
const config = require('./config.json');
const {createContext, CryptoFactory, Signer} = require('sawtooth-sdk/signing')
const {createHash} = require('crypto')
const {protobuf} = require('sawtooth-sdk')
const cbor = require('cbor')
const uuidv1 = require('uuid/v1')
const {Secp256k1PrivateKey, Secp256k1PublicKey} = require('sawtooth-sdk/signing/secp256k1.js')

const _hash = (x) =>
  createHash('sha512').update(x).digest('hex').toLowerCase()
const RC_FAMILY = "remotecompute"
const RC_NAMESPACE = _hash(RC_FAMILY).substring(0, 6)

class Config {
  constructor(){
    const defaultConfig = config.development;
    const environment = process.env.NODE_ENV || 'development';
    const environmentConfig = config[environment];
    const finalConfig = _.merge(defaultConfig, environmentConfig);
    this.gConfig = finalConfig;
    //console.log(`this.gConfig: ${JSON.stringify(this.gConfig, undefined, this.gConfig.json_indentation)}`);
  }
  getConfig() {
    return this.gConfig
  }
}


class PayloadProcessor {
  constructor(payload, gConfig) {
    this.payload = payload
    this.gConfig = gConfig
    console.log('config = ', this.gConfig)

    const context = createContext('secp256k1')
    const privateKey = Secp256k1PrivateKey.fromHex(this.gConfig.private_key)
    this.signer = new Signer(context, privateKey)

    console.log('signere pub key = ', this.signer.getPublicKey().asHex())
    console.log('private key = ', privateKey.asHex())
  }
  //let payload = new payloadCls(uuidv1())
  process() {
    const payloadBytes = cbor.encode(this.payload)
    console.log(this.payload)
    const transactionHeaderBytes = protobuf.TransactionHeader.encode({
          familyName: RC_FAMILY,
          familyVersion: '1.0',
          inputs: [RC_NAMESPACE],
          outputs: [RC_NAMESPACE],
          signerPublicKey: this.gConfig.public_key,
          batcherPublicKey: this.gConfig.public_key,
          dependencies: [],
          payloadSha512: createHash('sha512').update(payloadBytes).digest('hex')
        }).finish()
    console.log('headerbytes', transactionHeaderBytes)

    const signature = this.signer.sign(transactionHeaderBytes)

    const transaction = protobuf.Transaction.create({
        header: transactionHeaderBytes,
        headerSignature: signature,
        payload: payloadBytes
    })

    console.log('txn = ', transaction)

    const transactions = [transaction]

    const batchHeaderBytes = protobuf.BatchHeader.encode({
        signerPublicKey: this.signer.getPublicKey().asHex(),
        transactionIds: transactions.map((txn) => txn.headerSignature),
    }).finish()

    const batchSignature = this.signer.sign(batchHeaderBytes)

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
        url: this.gConfig.validator_rest_url + "batches",
        body: batchListBytes,
        headers: {'Content-Type': 'application/octet-stream'}
    }, (err, response) => {
        if (err) return console.log("error occured", err)
        console.log(response.body)
    })
  }
}

module.exports = { 
  PayloadProcessor,
  Config }
