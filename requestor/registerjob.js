const { PayloadProcessor, Config} = require('./requestor.js')
const {RCPayload, TXAction, JobRegistrationData} = require('../common/payload.js')
const cbor = require('cbor')
const fs = require('fs')

const gConfig = new Config()
let payload = new JobRegistrationData(TXAction.REGISTER, "ADDNUM", './addnum.yaml', 'docker-compose -f ./addnum.yaml up; docker-compose -f ./addnum.yaml down')
payload.inputs = './inputs/addnum1'
let encodedstr = cbor.encode(fs.readFileSync(payload.inputs))
payload.inputs = encodedstr
const processor = new PayloadProcessor(payload, gConfig.getConfig())
processor.process()
