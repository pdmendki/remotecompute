const { PayloadProcessor, Config} = require('./requestor.js')
const {RCPayload, TXAction} = require('../common/payload.js')
const uuidv1 = require('uuid/v1')

const gConfig = new Config()
let payload = new RCPayload(uuidv1(),"ADDNUM", TXAction.CREATE)
const processor = new PayloadProcessor(payload, gConfig.getConfig())
processor.process()
