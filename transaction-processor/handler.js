'use strict'
const {RCPayload, TXAction, JobData, JobStatus} = require('../common/payload')
const {RC_NAMESPACE, RC_FAMILY, JobState} = require('./state')

const { TransactionHandler } = require('sawtooth-sdk/processor/handler')
const { InvalidTransaction } = require('sawtooth-sdk/processor/exceptions')
const {protobuf} = require('sawtooth-sdk')
const TransactionHeader = protobuf.TransactionHeader
const cbor = require('cbor')
const {createHash} = require('crypto')


class RCHandler extends TransactionHandler {
  constructor () {
    super(RC_FAMILY, ['1.0'], [RC_NAMESPACE])
    console.log("constructed !")
  }


  apply( tprequest, ctx) {
    console.log("inside apply !!")
    return this.unpackTransaction(tprequest)
    .then((transactionData) => {
      console.log("txn data", transactionData)
      this.processPayload(transactionData, ctx).then( (data) => console.log('updated data', data),
        (err) => console.log('Error updating', err)
      )
    })
  }

/*  this.decodeData = (data) => {
    return cbor.decodeFirstSync(data)
  }

  this.encodeData = (data) => {
    return cbor.encode(data)
  }
*/
  unpackTransaction(transaction){
    return new Promise((resolve, reject) => {
      console.log('inside _unpackTransaction')
      console.log('tx header bytes', transaction.header)
  //    let header = TransactionHeader.decode(transaction.header)
      let header = transaction.header
      let signer = header.signerPublicKey
      try {
        console.log('signer public key = ', signer)
        let payload = cbor.decodeFirstSync(transaction.payload)
        resolve({data: payload,
                 signer: signer})
      } catch (err) {
        let reason =  new InvalidTransaction("Invalid payload serialization")
        reject(reason)
      }
    })
  }

  getJobAddress(Job) {
    let jobHash = createHash('sha512').update(job.type)
    jobHash.update(job.id)
    return( jobHash.digest('hex'))
  }

  processPayload(transaction, context){
    return new Promise((resolve, reject) => {
      let action = transaction.data.action
      if (action === 'create') {
        let job = new JobData(transaction.data.id, JobStatus.CREATED, transaction.data.type)
        job.owner = transaction.signer
        job.inputs=transaction.data.inputs
        let jobState = new JobState(context)
        if( null != jobState.getJob(job.id)){
          let reason =  new InvalidTransaction("Job with this ID already exist")
          reject(reason)
        } 
        else{
          console.log('Creating a new job state')
          try{
            jobState.updateJob(job).then(data => resolve(data), data => reject(data)) //TODO : fix this
          }
          catch (err){
            let reason = new InvalidTransaction("Error saving job state")
            reject(reason)
          }
        }
      }
      else if( action === 'register'){
      }
      else if( action === 'lock' ){
      }
      else if( action === 'submit'){
      }
      else if( action === 'accept'){
      }
      
    })
  }
}

module.exports = RCHandler

