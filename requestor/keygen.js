const {createContext, CryptoFactory} = require('sawtooth-sdk/signing')
const {Secp256k1PrivateKey, Secp256k1PublicKey} = require('sawtooth-sdk/signing/secp256k1.js')
const context = createContext('secp256k1')
const privateKey = context.newRandomPrivateKey()
console.log('priv', privateKey)
console.log('priv str', privateKey.asHex())
const pkey = Secp256k1PrivateKey.fromHex( privateKey.asHex())

console.log('priv1 str', pkey.asHex())
const signer = (new CryptoFactory(context)).newSigner(privateKey)
pubkey = signer.getPublicKey()
console.log('str = ', pubkey)
console.log('str = ', pubkey.asHex())

