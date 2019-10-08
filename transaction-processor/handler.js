'use strict'
const RCPayload = require('../common/payload')
const {RC_NAMESPACE, RC_FAMILY, RCJob, RCJobState} = require('./state')

const { TransactionHandler } = require('sawtooth-sdk/processor/handler')
const { InvalidTransaction } = require('sawtooth-sdk/processor/exceptions')
const {protobuf} = require('sawtooth-sdk')
const TransactionHeader = protobuf.TransactionHeader
const cbor = require('cbor')

const _decodeData = (data) => {
  return cbor.decodeFirstSync(data)
}

const _encodeData = (data) => {
  return cbor.encode(data)
}

const _unpackTransaction = (transaction) =>
  new Promise((resolve, reject) => {
    console.log('inside _unpackTransaction')
    console.log('tx header bytes', transaction.header)
//    let header = TransactionHeader.decode(transaction.header)
    let header = transaction.header
    let signer = header.signerPublicKey
    try {
      console.log('signer public key = ', signer)
      let payload = _decodeData(transaction.payload)
      resolve({data: payload,
               signer: signer})
    } catch (err) {
      let reason =  new InvalidTransaction("Invalid payload serialization")
      reject(reason)
    }
  })

class RCHandler extends TransactionHandler {
  constructor () {
    super(RC_FAMILY, ['1.0'], [RC_NAMESPACE])
    console.log("constructed !")
  }


  apply( tprequest, ctx) {
    console.log("inside apply !!")
    return _unpackTransaction(tprequest)
    .then((transactionData) => {
      console.log("txn data", transactionData)
    })
  }

}

module.exports = RCHandler

