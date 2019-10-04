'use strict'

const { TransactionProcessor } = require('sawtooth-sdk/processor')
const IntegerKeyHandler = require('./handler')

if (process.argv.length < 3) {
  console.log('missing a validator address')
  process.exit(1)
}

const address = process.argv[2]

const transactionProcessor = new TransactionProcessor(address)

transactionProcessor.addHandler(new IntegerKeyHandler())

transactionProcessor.start()
