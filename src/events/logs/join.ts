import { Event } from 'discore.js'
import { GuildMember, TextChannel } from 'discord.js'

import * as config from '../../config'

export default class extends Event {
  get options() {
    return { name: 'guildMemberAdd' }
  }

  run(member: GuildMember) {
    const logsChannel = member.guild.channels.cache.get(
      config.ids.channels.text.logs
    ) as TextChannel
    if (!logsChannel) return

    const embed = {
      color: config.meta.defaultColor,
      description: `${member} присоединился к нам!`,
      thumbnail: { url: member.user.displayAvatarURL({ dynamic: true }) },
      footer: { text: `ID: ${member.id}` },
      timestamp: Date.now()
    }
    logsChannel.send({ embed }).catch(() => {})
  }
}
