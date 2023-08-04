import { Event } from 'discore.js'
import { GuildMember, Message, TextChannel } from 'discord.js'

import client from '../../main'

import * as config from '../../config'

import Command, { CommandParams } from '../../structures/Command'

type Interaction = (
  channel: TextChannel,
  params: CommandParams,
  options?: ApplicationCommandInteractionDataOption[]
) => any

const interactions = new Map<string, Interaction>()

interactions.set('статистика', (channel, params, options) => {
  const message = {
    author: params.member.user,
    channel
  }

  const args: string[] = []
  if (options && options[0] && typeof options[0].value === 'string') {
    args.push(`<@${options[0].value}>`)
  }

  const command = client.commands.get('статистика') as Command
  if (command) command.execute(message as Message, args, params)
})

interactions.set('помощь', (channel, params, options) => {
  const message = {
    author: params.member.user,
    channel
  }

  const args: string[] = []
  if (options && options[0] && typeof options[0].value === 'string') {
    args.push(options[0].value)
  }

  const command = client.commands.get('помощь') as Command
  if (command) command.execute(message as Message, args, params)
})

interface ApplicationCommandInteractionDataOption {
  name: string
  value?: any
  options?: ApplicationCommandInteractionDataOption[]
}

interface Packet {
  t: 'INTERACTION_CREATE'
  d: {
    id: string
    type: 1 | 2
    data?: {
      id: string
      name: string
      options?: ApplicationCommandInteractionDataOption[]
    }
    guild_id: string
    channel_id: string
    member: object
    token: string
    version: 1
  }
}

export default class extends Event {
  get options() {
    return { name: 'raw' }
  }

  run(packet: Packet) {
    if (packet.t !== 'INTERACTION_CREATE') return
    if (!packet.d) return
    if (!config.meta.allowedGuilds.includes(packet.d.guild_id)) return

    const guild = client.guilds.cache.get(packet.d.guild_id)
    if (!guild) return

    const channel = client.channels.cache.get(packet.d.channel_id) as
      | TextChannel
      | undefined
    if (!channel) return

    const member = new GuildMember(client, packet.d.member, guild)

    const { data } = packet.d
    if (!data) return

    const interaction = interactions.get(data.name.toLowerCase())
    if (!interaction) return

    interaction(channel, { guild, member }, data.options)
  }
}
