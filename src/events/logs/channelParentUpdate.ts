import { Event } from 'discore.js'
import { TextChannel, GuildChannel } from 'discord.js'

import * as config from '../../config'

export default class extends Event {
  get options() {
    return { name: 'channelUpdate' }
  }

  run(oldChannel: GuildChannel, newChannel: GuildChannel) {
    if (!newChannel.guild) return

    const logsChannel = newChannel.guild.channels.cache.get(
      config.ids.channels.text.logs
    ) as TextChannel
    if (!logsChannel) return

    if (oldChannel.parentID === newChannel.parentID) return

    const embed = {
      color: config.meta.defaultColor,
      description: `Канал отредактирован\n> \`${newChannel.name}\``,
      fields: [
        {
          name: 'Категория',
          value: `« **\`**${
            (oldChannel.parent || {}).name || 'Отсутствует'
          }**\`** » ⇒ « **\`**${
            (newChannel.parent || {}).name || 'Отсутствует'
          }**\`** »`,
          inline: false
        }
      ],
      footer: { text: `ID: ${newChannel.id}` },
      timestamp: Date.now()
    }
    logsChannel.send({ embed }).catch(() => {})
  }
}
