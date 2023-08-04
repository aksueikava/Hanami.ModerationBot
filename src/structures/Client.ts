import * as chalk from 'chalk'
import { ClientUser, Collection, Guild } from 'discord.js'

import * as config from '../config'
import * as logger from '../utils/logger'

import { Core } from '../main'

export default class Client extends Core {
  public runTick = Date.now()
  private eventStates = new Collection<string, { enabled: boolean }>()

  get guild() {
    return this.guilds.cache.get(config.meta.workingGuild) as Guild
  }

  disableEvents() {
    this.events
      .filter(e => e.name !== 'ready')
      .forEach(e => {
        this.eventStates.set(e._id, { enabled: e.enabled })
        e.disable()
      })
  }

  enableEvents() {
    ;[...this.eventStates.entries()]
      .filter(([_, info]) => info.enabled)
      .map(([id]) => this.events.get(id))
      .forEach(e => e.enable())
  }

  checkMainGuildExistance() {
    if (!this.guild) {
      logger.error(
        chalk.cyan.bold('[BOT]'),
        'Main guild not found.',
        chalk.red.bold('Exiting..')
      )
      process.exit(1)
    }
  }

  readyMessage() {
    const clientUser = this.user as ClientUser
    logger.log(
      chalk.cyan.bold('[BOT]'),
      'Started:',
      chalk.green.bold(clientUser.tag),
      'in',
      `${chalk.yellow.bold(
        Number(((Date.now() - this.runTick) / 1e3).toFixed(2))
      )}s`
    )
  }

  processPrefixes() {
    this.commands.forEach(c => {
      if (typeof c.aliases === 'string') c.aliases = [c.aliases]
      const prefix = c.custom.prefix || config.internal.prefix
      c.name = `${prefix}${c.name}`
      c.aliases = c.aliases.map(a => `${prefix}${a}`)
    })
  }

  setStatus() {
    const clientUser = this.user
    if (!clientUser) return

    clientUser.setActivity({ name: '', type: 'WATCHING' }).catch(() => {})
  }
}
