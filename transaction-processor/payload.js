'use strict'

const { InvalidTransaction } = require('sawtooth-sdk/processor/exceptions')

class RCPayload {
  constructor(id, action) {
    this.id = id
    this.action = action
  }
}

module.exports = RCPayload
