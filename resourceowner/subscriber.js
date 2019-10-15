// module variables
'use strict'

const _ = require('lodash')
const config = require('./config.json');
const defaultConfig = config.development;
const environment = process.env.NODE_ENV || 'development';
const environmentConfig = config[environment];
const finalConfig = _.merge(defaultConfig, environmentConfig);
const cbor = require('cbor')
const tmp = require('tmp')
const path = require('path')
const fs = require('fs')
const { PayloadProcessor} = require('../requestor/requestor.js')
const {RCPayload, TXAction, JobData, JobRegistrationData, JobStatus} = require('../common/payload')
const {RC_FAMILY} = require('../common/state')
const {createHash} = require('crypto')
const { Stream } = require('sawtooth-sdk/messaging/stream')
const compose = require('docker-compose')
const child_process =  require('child_process')

const INPUTFILE_NAME = 'input'
const RESULTSFILE_NAME = 'output'
const DOCKER_COMPOSE_FILENAME = 'docker-compose.yaml'

const {
  Message,
  EventList,
  EventSubscription,
  EventFilter,
  StateChangeList,
  ClientEventsSubscribeRequest,
  ClientEventsSubscribeResponse
} = require('sawtooth-sdk/protobuf')

global.gConfig = finalConfig;

//console.log(`global.gConfig: ${JSON.stringify(global.gConfig, undefined, global.gConfig.json_indentation)}`);

const _hash = (x) =>
  createHash('sha512').update(x).digest('hex').toLowerCase()
const RC_NAMESPACE = _hash(RC_FAMILY).substring(0, 6)

const NULL_BLOCK_ID = '0000000000000000'
const VALIDATOR_URL = global.gConfig.validator_url
const stream = new Stream(VALIDATOR_URL)


// Parse Block Commit Event
const getBlock = events => {
  const block = _.chain(events)
    .find(e => e.eventType === 'sawtooth/block-commit')
    .get('attributes')
    .map(a => [a.key, a.value])
    .fromPairs()
    .value()

  return {
    blockNum: parseInt(block.block_num),
    blockId: block.block_id,
    stateRootHash: block.state_root_hash
  }
}

// Parse State Delta Event
const getChanges = events => {
  const event = events.find(e => e.eventType === 'sawtooth/state-delta')
  if (!event) return []

  const changeList = StateChangeList.decode(event.data)
  return changeList.stateChanges
    .filter(change => change.address.slice(0, 6) === RC_NAMESPACE)
}

// Handle event message received by stream
const handleEvent = msg => {
  if (msg.messageType === Message.MessageType.CLIENT_EVENTS) {
    const events = EventList.decode(msg.content).events
    //deltas.handle(getBlock(events), getChanges(events))
    console.log('Received notificatio for Block data = ', getBlock(events))
    let stateChanges = getChanges(events)
    for (var i in stateChanges) {
      let change = stateChanges[i]
      console.log ('Received notification for state change at this address = ', change.address)
      let changeDataStr = cbor.decodeFirstSync(change.value)
      //console.log('state change = ', changeDataStr)
      
      //Check if the job type is created
      if( changeDataStr.indexOf(JobStatus.CREATED) > -1) {
        //console.log ('new job created= ', cbor.decodeFirstSync(change.value))
        let job = JSON.parse(changeDataStr) 
        console.log('Received notification for the job = ', job.id)
        if( global.gConfig.job_types_to_solve.includes( job.type)){
          let payload = new RCPayload(job.id, TXAction.LOCK, job.type)
          const processor = new PayloadProcessor(payload, global.gConfig)
          //console.log('payload = ',payload)
          console.log('Aquiring lock')
          processor.process()
        }
      }
      else if( changeDataStr.indexOf(JobStatus.LOCKED) > -1) {
        let job = JSON.parse(changeDataStr) 
        console.log ('job locked successfully = ', job.id)
        if( global.gConfig.job_types_to_solve.includes( job.type)){
          console.log('solving job type ', job.type)  
          let tmpdir = tmp.dirSync()
          console.log('Job files are fetched in ', tmpdir)
          //console.log('inputs = ', job.inputs)
          let parsedInputs = Buffer.from(job.inputs,'base64')
          //console.log('parsed in', parsedInputs)
          //input files
          let inputPath = path.join(tmpdir.name, INPUTFILE_NAME)
          let inputFileData = parsedInputs//cbor.decodeFirstSync(parsedInputs)
          fs.writeFileSync(inputPath, inputFileData)
          //docker-compose file
          let dockerFilePath = path.join(tmpdir.name, DOCKER_COMPOSE_FILENAME)
          fs.writeFileSync(dockerFilePath, Buffer.from(job.dockerfiledata,'base64'))
          //output file
          //let resultsFile = path.join(tmpdir, RESULTSFILE_NAME)
          /*
          compose.down().then( () => {
            compose.upAll({ cwd: tmpdir.name, log: true})
            .then(
              () => { console.log('Job execution is done');compose.down()}
              //err => { console.log('something went wrong:', err.message);compose.down()}
            ); 
            //tmpdir.removeCallback()
          })
          .catch( err => {console.log('error = ', err)})
          */
          child_process.execFileSync("docker-compose", ["up" ], {cwd : tmpdir.name ,stdio: 'inherit'})
          child_process.execFileSync("docker-compose", ["down" ], {cwd : tmpdir.name, stdio: 'inherit'})
          console.log('Job output is at location ', path.join(tmpdir.name, RESULTSFILE_NAME))
        }
        else{
          console.log('skipping job type ', job.type)
        }
        //console.log('job = ', job)
      }
    }  
    //console.log('StateDelta data = ', getChanges(events))
  } else {
    console.warn('Received message of unknown type:', msg.messageType)
  }
}

// Send delta event subscription request to validator
const subscribe = () => {
  const blockSub = EventSubscription.create({
    eventType: 'sawtooth/block-commit'
  })
  const deltaSub = EventSubscription.create({
    eventType: 'sawtooth/state-delta',
    filters: [EventFilter.create({
      key: 'address',
      matchString: `^${RC_NAMESPACE}.*`,
      filterType: EventFilter.FilterType.REGEX_ANY
    })]
  })
  return stream.send(
    Message.MessageType.CLIENT_EVENTS_SUBSCRIBE_REQUEST,
    ClientEventsSubscribeRequest.encode({
      lastKnownBlockIds: [NULL_BLOCK_ID],
      subscriptions: [blockSub, deltaSub]
    }).finish()
  )
    .then(response => ClientEventsSubscribeResponse.decode(response))
    .then(decoded => {
      console.log('Subscription is successful!')
      const status = _.findKey(ClientEventsSubscribeResponse.Status,
                               val => val === decoded.status)
      if (status !== 'OK') {
        throw new Error(`Validator responded with status "${status}"`)
      }
    })
}

// Start stream and send delta event subscription request
const start = () => {
  return new Promise(resolve => {
    stream.connect(() => {
      stream.onReceive(handleEvent)
      subscribe().then(resolve)
    })
  })
}

module.exports = {
  start
}
