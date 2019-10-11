'use strict'

const crypto = require('crypto')
const {RCPayload, TXAction, JobData, JobStatus} = require('../common/payload')
const cbor = require('cbor')

/*class Job{
  constructor(id, state=null, owner=null, solver=null, cmd){
    this.id = id
    this.state = state
    this.owner = owner
    this.solver = solver
    this.command = cmd
    this.inputs = null
    this.results = null
  }
}*/

const _hash = (x) =>
  crypto.createHash('sha512').update(x).digest('hex').toLowerCase().substring(0, 64)

const RC_FAMILY = 'remotecompute'

const RC_NAMESPACE = _hash(RC_FAMILY).substring(0, 6)

const _makeRcAddress = (x) => RC_NAMESPACE + _hash(x)

const _timeout = 500

class JobState {
  constructor(ctx) {
    this.ctx = ctx
  }

  updateJob(job) {
    let addr = _makeRcAddress(job.id)
    let data = cbor.encode(JSON.stringify("favafsadfsadf"))
    let entries = { [addr] : data}
    console.log('setting states', entries)
    return this.ctx.setState(entries, _timeout)
  }

  getJob(id) {
    let addr = _makeRcAddress(id)
    return this.ctx.getState([addr], _timeout)
		  /*.then((jobvals) => 
	   /* {
      console.log('reading states', jobvals)
      if(jobvals && jobvals[addr] && jobvals[addr].length > 0){
	console.log('read this =', jobvals[addr])
        let obj = JSON.parse(cbor.decodeFirstSync(jobvals[addr]))
	console.log('job obj = ', obj)
        return obj
      }
    }
    )*/
  }
  
  checkForStateUpdates(job) {
    let j1 = this.getJob(job.id)
    j1.state = job.state
    if (j1 === job)
      return true
    else
      return false
  }

} //class JobState


module.exports = {
  RC_NAMESPACE,
  RC_FAMILY,
  JobState,
  _makeRcAddress
}
