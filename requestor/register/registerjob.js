const { PayloadProcessor, Config} = require('../requestor.js')
const {RCPayload, TXAction, JobRegistrationData} = require('../../common/payload.js')
const cbor = require('cbor')
const fs = require('fs')
const commander = require('commander');
const program = new commander.Command();
const path = require('path')

program
  .option('-t, --type <type>','job type')
  .option('-f, --dockerfile <type>', 'docker compose file path to run job')
  .option('-c, --command <type>','comman to run docker file')
  .usage("[global options] command")
  .parse(process.argv)

console.log("options = ", program.opts())
const gConfig = new Config()
let dockerfilename = path.basename(program.dockerfile)
let encodedDockerfileData = fs.readFileSync(program.dockerfile).toString('base64')
let payload = new JobRegistrationData(TXAction.REGISTER, program.type, encodedDockerfileData, dockerfilename, program.command)
//'docker-compose -f ./addnum.yaml up; docker-compose -f ./addnum.yaml down')
const processor = new PayloadProcessor(payload, gConfig.getConfig())
processor.process()
