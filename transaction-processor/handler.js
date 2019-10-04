'use strict'
const RCPayload = require('./payload')
const {RC_NAMESPACE, RC_FAMILY, RCJob, RCJobState} = require('./state')

const { TransactionHandler } = require('sawtooth-sdk/processor/handler')
const { InvalidTransaction } = require('sawtooth-sdk/processor/exceptions')

class RCHandler extends TransactionHandler {
  constructor () {
    super(RC_FAMILY, ['1.0'], [RC_NAMESPACE])
  }

  apply( tprequest, ctx) {
  }
}

module.exports = RCHandler

