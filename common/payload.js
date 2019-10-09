'use strict'

const TXAction = {
 CREATE : 'create',
 REGISTER : 'register',
 LOCK : 'lock',
 SUBMIT : 'submit',
 ACCEPT : 'accept'
}

const JobStatus = {
 CREATED : 1,
 LOCKED : 2,
 SUBMITTED : 3,
 ACCEPTTED : 4
}

class RCPayload {
  constructor(id=null, type=null, action=null, inputs=null, results=null) {
    this.id = id
    this.action = action
    this.type=type
    this.inputs=inputs
    this.results=results
  }
}

class JobData {
  constructor(id, state, type, inputs=null, results=null, owner=null, solver=null,){
    this.id = id
    this.state=state
    this.type=type
    this.inputs=inputs
    this.results=results
    this.owner=owner
    this.solver=solver
  }
  
}
module.exports = { RCPayload,
  TXAction,
  JobData,
  JobStatus }
