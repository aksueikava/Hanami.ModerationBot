import { Event } from 'discore.js'
import { GuildMember } from 'discord.js'

import Moderator from '../models/moderator'

import * as config from '../config'

function isModerator(member: GuildMember) {
  const ids = config.meta.modRoles
  return ids.some(id => member.roles.cache.has(id))
}

export default class extends Event {
  get options() {
    return { name: 'guildMemberUpdate' }
  }

  async run(oldMember: GuildMember, newMember: GuildMember) {
    if (isModerator(oldMember)) return
    if (!isModerator(newMember)) return

    const mod = await Moderator.getOne({ user_id: newMember.id })
    mod.staff_since = Date.now()
    mod.save()
  }
}
