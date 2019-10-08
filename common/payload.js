'use strict'

class RCPayload {
  constructor(id=null, type=null, action=null) {
    this.id = id,
    this.type=type,
    this.action = action
  }
}

module.exports = RCPayload
