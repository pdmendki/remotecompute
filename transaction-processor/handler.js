'use strict'
const {RCPayload, TXAction, JobData, JobRegistrationData, JobStatus} = require('../common/payload')
const {RC_NAMESPACE, RC_FAMILY, JobState, _makeRcAddress} = require('../common/state')

const { TransactionHandler } = require('sawtooth-sdk/processor/handler')
const { InvalidTransaction } = require('sawtooth-sdk/processor/exceptions')
const {protobuf} = require('sawtooth-sdk')
const TransactionHeader = protobuf.TransactionHeader
const cbor = require('cbor')
const {createHash} = require('crypto')
const { PayloadProcessor} = require('../requestor/requestor.js')


class RCHandler extends TransactionHandler {
  constructor () {
    super(RC_FAMILY, ['1.0'], [RC_NAMESPACE])
    console.log("constructed !")
  }

 /* getJobFromId(jobId) {
    let address = _makeRcAddress(jobId)
    return context.getState([address])
    .then( (possibleAddressValues) => {
      if( possibleAddressValues && possibleAddressValues.length){
      }
    }
  }
 */ 
  updateJobStatus( jobId, newStatus){
  }

  apply( tprequest, context) {
    console.log("inside apply !!")
      let header = tprequest.header
      let signer = header.signerPublicKey
      console.log('signer public key = ', signer)
      let payload = cbor.decodeFirstSync(tprequest.payload)
      let transaction = ({data: payload,
                         signer: signer})

      console.log("txn data", transaction)
      let action = transaction.data.action
      let actionPromise = null
      if (action === 'create') {
        let job = new JobData(transaction.data.id, JobStatus.CREATED, transaction.data.type)
        job.owner = transaction.signer
        job.inputs=transaction.data.inputs
        job.bid=transaction.data.bid
        let address = _makeRcAddress(job.id)
        if (job.inputs === null) {
          throw (new InvalidTransaction("Job inputs cant be null"))
        } 
        return context.getState([address])
        .then( (possibleAddressValues) => {
          if( possibleAddressValues && possibleAddressValues.length){
            console.log("Job Id already present")
            throw(  new InvalidTransaction("Job with this ID already exist"))
          } 
          else {
            let typeAddress = _makeRcAddress(job.type)
            return context.getState([typeAddress])
            .then( (jobRegistrationData) => {
              if (jobRegistrationData === null || jobRegistrationData.length === 0){
                throw ( new InvalidTransaction("Job type is not registered"))
              }
              else {
                let jobRegistration = JSON.parse(cbor.decodeFirstSync(jobRegistrationData[typeAddress]))
                console.log('job registration data', jobRegistration)
                job.dockerfiledata=jobRegistration.dockerfiledata
                job.dockerfilename=jobRegistration.dockerfilename
                job.command=jobRegistration.command
                console.log('modified job = ', job)
                console.log('stringified job -', JSON.stringify(job))
                let encodedJob = cbor.encode(JSON.stringify(job))
                console.log('job address = ', address)
                let entries = { [address] : encodedJob
                }
                return context.setState(entries)
              }
            })
          }//if( possibleAddressValues && possibleAddressValues.length)
        })
	      .catch( err => {
          console.log('Error in creating job', err)
        })
      }
      else if( action === 'register'){
        //let jobRegistrationData = JSON.parse(transaction.data)
        let jobRegistrationData = new JobRegistrationData(action, transaction.data.type, transaction.data.dockerfiledata, transaction.data.dockerfilename, transaction.data.command)
        console.log('job registration data = ', jobRegistrationData)

        if(jobRegistrationData.type === null || jobRegistrationData.dockerfiledata === null || jobRegistrationData.command === null){
          throw (new InvalidTransaction("Invalid input for job registration"))
        }
        let address = _makeRcAddress(jobRegistrationData.type)
        return context.getState([address])
        .then( (possibleAddressValues) => {
          if( possibleAddressValues && possibleAddressValues.length){
            console.log("Job type is already registered")
            throw(  new InvalidTransaction("Job with type is already registered"))
          } 
          else {
            let entries = { [address] : cbor.encode(JSON.stringify(jobRegistrationData))
            }
            return context.setState(entries)
          }
        })
	      .catch( err => {
          console.log('Error in creating job', err)
        })
      }
      else if( action === 'lock' ){
        let address = _makeRcAddress(transaction.data.id)
        console.log('address to lock', address)
        return context.getState([address])
        .then( (possibleAddressValues) => {
          console.log('getState = ', possibleAddressValues)
          if( possibleAddressValues && possibleAddressValues[address]){
            console.log("Job Id already present")
            let job = JSON.parse(cbor.decodeFirstSync(possibleAddressValues[address]))
            if (job.state != JobStatus.CREATED){
              throw( new InvalidTransaction("Previous state of job must be CREATED"))
            }
            else {
              job.state = JobStatus.LOCKED
              let entries = { [address] : cbor.encode(JSON.stringify(job))
              }
              return context.setState(entries)
            }
          } 
          else {
            throw(  new InvalidTransaction("Job with this ID doesn't exist"))
          }
        })
      }
      else if( action === 'submit'){
      }
      else if( action === 'accept'){
      }
    /* 
      return actionPromise.then( addresses => {
        if(addresses.length === 0) {
          throw new InternalError("States are not updated !")
        } else {
	  console.log("updated states", addresses)
	}
      })
      /*var entries = {}
      entries['9a6181f5f8e790f1cf0d8edfbef092febfe5e9ef9eb51b69760a27e013445d0b4a8272'] = Buffer.from("test")
      return ctx.setState(entries, 5000).then(res => console.log('done', res)).catch( err => console.log('err', err))
      */
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
        jobState.getJob(job.id)
	        .catch()
	        .then( x => {
	        if(x && x.length > 0) {
            let reason =  new InvalidTransaction("Job with this ID already exist")
            reject(reason)
          }
          else{
            console.log('Creating a new job state')
            let prom = jobState.updateJob(job)
	          resolve(prom)
          }
        })
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

