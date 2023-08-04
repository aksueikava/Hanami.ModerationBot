export { Core } from 'discore.js'

import db from './utils/db'
import Client from './structures/Client'
import * as config from './config'
import { existsSync, readFileSync } from 'fs'
import { Intents } from 'discord.js'

require('events').EventEmitter.defaultMaxListeners = 0

if (existsSync('./.env')) {
  readFileSync('./.env', 'utf8')
    .toString()
    .split(/\n|\r|\r\n/)
    .forEach(e => {
      const keyValueArr = e.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
      if (keyValueArr != null) {
        process.env[keyValueArr[1]] = keyValueArr[2]
      }
    })
}
const client = new Client({
  commandOptions: {
    argsSeparator: ' ',
    ignoreBots: true,
    ignoreCase: true,
    ignoreSelf: true
  },
  ws: { intents: Intents.ALL },
  token:
    config.internal.token.length > 0
      ? config.internal.token
      : process.env.CLIENT_TOKEN,
  prefix: '',
  db
})

client.disableEvents()
client.processPrefixes()

export const voiceMembers = new Map<string, number>()
export default client
