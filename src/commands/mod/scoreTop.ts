import { Message } from 'discord.js'

import Command from '../../structures/Command'
import Moderator from '../../models/moderator'

import * as config from '../../config'

export default class extends Command {
  get options() {
    return { name: 'топ баллов' }
  }

  async execute(message: Message, _args: string[]) {
    if (!message.guild) return

    const docs = await Moderator.filter(d => typeof d.score === 'number')
    const filteredDocs = docs.filter(d => {
      const member = message.guild!.members.cache.get(d.user_id)
      if (!member) return false
      if (!config.meta.modRoles.some(id => member.roles.cache.has(id))) {
        return false
      }
      return true
    })
    const sortedDocs = filteredDocs
      .sort((b, a) => a.score - b.score)
      .slice(0, 10)

    message.channel.send({
      embed: {
        color: config.meta.defaultColor,
        description:
          sortedDocs
            .map((d, i) => {
              return `${i + 1}. <@${d.user_id}> : ${d.score.toLocaleString(
                'ru-RU'
              )}`
            })
            .join('\n') || '\u200b'
      }
    })
  }
}
