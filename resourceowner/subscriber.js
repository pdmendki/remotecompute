// module variables
'use strict'

const _ = require('lodash')
const config = require('./config.json');
const defaultConfig = config.development;
const environment = process.env.NODE_ENV || 'development';
const environmentConfig = config[environment];
const finalConfig = _.merge(defaultConfig, environmentConfig);
const cbor = require('cbor')

const { Stream } = require('sawtooth-sdk/messaging/stream')
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

console.log(`global.gConfig: ${JSON.stringify(global.gConfig, undefined, global.gConfig.json_indentation)}`);

const {RC_FAMILY} = require('../common/state')
const {createHash} = require('crypto')
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
    console.log('Block data = ', getBlock(events))
    let stateChanges = getChanges(events)
    for (var i in stateChanges) {
      let change = stateChanges[i]
      console.log ('Address = ', change.address)
      console.log ('change data = ', cbor.decodeFirstSync(change.value))
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
      console.log('Subscription response !')
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
