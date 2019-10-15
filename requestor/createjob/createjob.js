const { PayloadProcessor, Config} = require('../requestor.js')
const {RCPayload, TXAction} = require('../../common/payload.js')
const cbor = require('cbor')
const uuidv1 = require('uuid/v1')
const fs = require('fs')
const commander = require('commander');
const program = new commander.Command();
const path = require('path')

program
  .option('-t, --type <type>','job type')
  .option('-i, --inputfile <type>', 'input file for the job')
  .usage("[global options] command")
  .parse(process.argv)

console.log("options = ", program.opts())

const gConfig = new Config()
let payload = new RCPayload(uuidv1(), TXAction.CREATE, program.type)
payload.inputs = program.inputfile
let encodedstr = fs.readFileSync(payload.inputs).toString('base64')
payload.inputs = encodedstr
const processor = new PayloadProcessor(payload, gConfig.getConfig())
console.log(encodedstr)
processor.process()
