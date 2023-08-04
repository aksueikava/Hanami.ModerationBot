import { Command as BaseCommand, Discord } from 'discore.js'

import client from '../main'
import * as Util from '../utils/util'
import * as config from '../config'

import { NilPartial } from '../utils/types'

export interface CommandParams {
  guild: Discord.Guild
  member: Discord.GuildMember
}

export interface CommandLocalParams {
  message: Discord.Message
  args: string[]
  params: CommandParams
}

export default abstract class Command extends BaseCommand {
  async run(message: Discord.Message, args: string[]) {
    const params = {
      message,
      args,
      params: await this.parseParams({ message, args })
    }

    this.middleware(params)
    if (!this.validate(params)) return

    const commandArgs: [Discord.Message, string[], CommandParams] = [
      params.message,
      params.args,
      params.params
    ]
    if (!this.validateAccess(params)) return this.noAccessExec(...commandArgs)

    if (config.ticks.commandDelete > -1) {
      message.delete({ timeout: config.ticks.commandDelete }).catch(() => {})
    }
    this.execute(...commandArgs)
  }

  async parseParams(params: {
    message: Discord.Message
    args: string[]
  }): Promise<CommandParams> {
    const commandParams: NilPartial<CommandParams> = {
      guild: params.message.guild,
      member: params.message.member
    }

    const guild = commandParams.guild || client.guild
    if (!commandParams.guild) commandParams.guild = guild
    if (!commandParams.member) {
      commandParams.member = await guild.members.fetch(params.message.author.id)
    }

    return commandParams as CommandParams
  }

  middleware(params: CommandLocalParams): void {
    const { custom } = this
    if (custom.suppressArgs) params.args = this.suppressArgs(params.args)
  }

  suppressArgs(args: string[]): string[] {
    return args.filter(a => a.length > 0)
  }

  validate(params: CommandLocalParams): boolean {
    const { custom } = this
    const guildID = (params.message.guild || {}).id

    if (custom.guildOnly && !guildID) return false
    if (guildID && !Util.verifyGuild(guildID)) return false

    return true
  }

  validateAccess(params: CommandLocalParams): boolean {
    const { custom } = this

    const allowedChats: string[] = custom.allowedChats || []
    const channelID = params.message.channel.id
    if (allowedChats.length > 0 && !allowedChats.includes(channelID)) {
      return false
    }

    const allowedRoles: string[] = custom.allowedRoles || []
    const allowedUsers: string[] = custom.allowedUsers || []
    const allowedPerms = custom.allowedPerms || 0

    if (
      [allowedRoles, allowedUsers].every(e => e.length < 1) &&
      allowedPerms < 1
    ) {
      return true
    }
    const permsAccess = this.validatePermsAccess(params)
    const roleAccess = this.validateRoleAccess(params)
    const userAccess = this.validateUserAccess(params)
    return userAccess || roleAccess || permsAccess
  }

  validateUserAccess(params: CommandLocalParams): boolean {
    const { custom } = this
    const allowedUsers: string[] = custom.allowedUsers || []
    return allowedUsers.includes(params.message.author.id)
  }

  validateRoleAccess(params: CommandLocalParams): boolean {
    const { custom } = this
    const allowedRoles: string[] = custom.allowedRoles || []
    const commandParams = params.params
    if (allowedRoles.length < 1) return false

    const hasrole = (id: string) => commandParams.member.roles.cache.has(id)
    if (allowedRoles.every(id => !hasrole(id))) return false
    return true
  }

  validatePermsAccess(params: CommandLocalParams): boolean {
    const { custom } = this
    const allowedPerms: number = custom.allowedPerms || 0
    const commandParams = params.params
    if (allowedPerms < 1) return false

    if (!commandParams.member.hasPermission(allowedPerms)) return false
    return true
  }

  noAccessExec(
    _message: Discord.Message,
    _args: string[],
    _params: CommandParams
  ): any {}

  abstract execute(
    message: Discord.Message,
    args: string[],
    params: CommandParams
  ): any
}
