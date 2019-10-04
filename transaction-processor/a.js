'use strict'

var cbor = require('cbor')

class Job{
  constructor(id, state=null, owner=null, solver=null){
    this.id = id
    this.state = state
    this.owner = owner
    this.solver = solver
  }
}

var myjob = new Job(1,"created","0xafsdfsdfsfdsfs","0x0asfcdsff")
var str = JSON.stringify(myjob)
var str1 = cbor.encode(str)
console.log(str1)
var j1 = JSON.parse(str)
j1 = JSON.parse(cbor.decodeFirstSync(str1))
console.log("obj = ", j1)
