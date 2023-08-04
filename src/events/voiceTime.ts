import { Event } from 'discore.js'
import { VoiceState, VoiceChannel, GuildMember } from 'discord.js'

import { voiceMembers } from '../main'
import Moderator from '../models/moderator'
import * as config from '../config'

function voiceJoin(member: GuildMember) {
  const exists = voiceMembers.has(member.id)
  if (exists) return

  voiceMembers.set(member.id, Math.floor(Date.now() / 1e3))
}

async function voiceLeave(member: GuildMember) {
  const existing = voiceMembers.get(member.id)
  if (!existing) return

  voiceMembers.delete(member.id)

  const moderator = await Moderator.getOne({ user_id: member.id })
  moderator.voice_time += existing
  moderator.day_voice_time += existing
  moderator.save()
}

export default class extends Event {
  get options() {
    return { name: 'voiceStateUpdate' }
  }

  run(oldState: VoiceState, newState: VoiceState): any {
    const member = oldState.member || newState.member
    if (!member) return
    if (!config.meta.modRoles.some(id => member.roles.cache.has(id))) return

    const oldChannel = oldState.channel
    const newChannel = newState.channel

    if ((oldChannel || {}).id === (newChannel || {}).id) {
      if (oldState.mute && !newState.mute) voiceLeave(member)
      else if (newState.mute && !oldState.mute) voiceJoin(member)
      return
    }

    const check = (channel: VoiceChannel | null) => {
      const categories = [
        ...config.meta.modCategories,
        config.ids.categories.events,
        config.ids.categories.closes
      ]
      return categories.includes((channel || {}).parentID || '')
    }

    if (!check(oldChannel) && check(newChannel)) voiceJoin(member)
    else if (check(oldChannel) && !check(newChannel)) voiceLeave(member)
  }
}
