'use strict'

const TXAction = {
 CREATE : 'create',
 REGISTER : 'register',
 LOCK : 'lock',
 SUBMIT : 'submit',
 ACCEPT : 'accept'
}

const JobStatus = {
 CREATED : "JOB_CREATED",
 LOCKED : "JOB_LOCKED",
 SUBMITTED : "JOB_SUBMITTED",
 ACCEPTTED : "JOB_ACCEPTED"
}

class RCPayload {
  constructor(id=null, action=null, type=null, inputs=null, bid=null, results=null) {
    this.id=id
    this.action=action
    this.type=type
    this.inputs=inputs
    this.results=results
    this.bid=bid
  }
}

class JobRegistrationData{
  constructor(action, type, dockerfiledata, dockerfilename, command){
    this.action = action
    this.type = type
    this.dockerfiledata = dockerfiledata
    this.dockerfilename = dockerfilename
    this.command = command
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
    this.dockerfiledata=null
    this.dockerfilename=null
    this.command=null
    this.bid=null
  }
  
}
module.exports = { RCPayload,
  TXAction,
  JobData,
  JobRegistrationData,
  JobStatus }
