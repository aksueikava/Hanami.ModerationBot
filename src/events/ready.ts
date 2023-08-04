import { Event } from 'discore.js'
import { GuildMember } from 'discord.js'

import client, { voiceMembers } from '../main'

import * as Util from '../utils/util'
import * as config from '../config'

export default class extends Event {
  run() {
    client.checkMainGuildExistance()

    const some = (member: GuildMember, id: string) => member.roles.cache.has(id)

    client.guild.voiceStates.cache
      .filter(s => {
        const { member } = s
        if (!member) return false
        if (!s.channel) return false
        if (!s.channel.parentID) return false
        if (!config.meta.modCategories.includes(s.channel.parentID))
          return false

        return config.meta.modRoles.some(some.bind(null, member))
      })
      .forEach(s => voiceMembers.set(s.id, Date.now()))

    client.enableEvents()
    Util.checkTemps()
    Util.checkModerators()
    client.readyMessage()
  }
}
