import { Event } from 'discore.js'
import { Permissions, VoiceState } from 'discord.js'

import * as Util from '../utils/util'
import * as config from '../config'

export default class extends Event {
  get options() {
    return { name: 'voiceChannelJoin' }
  }

  run(_: VoiceState, newState: VoiceState) {
    const { member, channel } = newState
    if (!member) return
    if (!channel) return
    if (!Util.verifyWorkingGuild(member.guild.id)) return

    const perms = channel.permissionOverwrites.get(config.ids.roles.mute)
    if (!perms) return

    const flags = Permissions.FLAGS.SPEAK
    const muted = newState.serverMute

    if (member.roles.cache.has(config.ids.roles.mute)) {
      if ((perms.deny.bitfield & flags) < 1) {
        if (muted) newState.setMute(false).catch(() => {})
      } else {
        if (!muted) newState.setMute(true).catch(() => {})
      }
    } else if ((perms.deny.bitfield & flags) > 0 && muted) {
      newState.setMute(false).catch(() => {})
    }
  }
}
