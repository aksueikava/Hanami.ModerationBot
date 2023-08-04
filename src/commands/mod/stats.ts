import { Message, MessageEmbedOptions } from 'discord.js'

import Rebuke from '../../models/rebuke'
import Ticket from '../../models/ticket'
import Moderator from '../../models/moderator'

import * as Util from '../../utils/util'
import * as config from '../../config'

import Command, { CommandParams } from '../../structures/Command'

import { voiceMembers } from '../../main'

export default class extends Command {
  get options() {
    return { name: 'статистика' }
  }

  get cOptions() {
    return {
      suppressArgs: true,
      allowedRoles: config.access.commands.stats
    }
  }

  async execute(
    message: Message,
    args: string[],
    { guild, member }: CommandParams
  ) {
    const sendError = (content: string) => {
      const embed = { color: config.meta.defaultColor, description: content }
      message.channel
        .send({ embed })
        .then(msg => msg.delete({ timeout: config.ticks.errMsgDeletion }))
        .catch(() => {})
    }

    const targetMember =
      (await Util.resolveMember(args.shift() || '', guild)) || member

    const some = (id: string) => targetMember.roles.cache.has(id)
    if (!config.meta.modRoles.some(some)) {
      sendError('Участник не является модератором')
      return
    }

    const mod = await Moderator.getOne({ user_id: targetMember.id })
    const rebukes = await Rebuke.filter(r => r.user_id === targetMember.id)
    const closedTickets = await Ticket.filter(t => {
      return (
        t.moder_id === targetMember.id &&
        t.status === config.ids.ticketStatuses.closed
      )
    })

    const now = Date.now()
    const staffDays = Math.floor((now - (mod.staff_since || now)) / 8.64e7)

    const totalScore = mod.score || 0
    // closedTickets
    //   .map(t => (t.assessment || 0) * 0.5)
    //   .reduce((acc, a) => acc + a, 0)

    const actualVoiceTime = now - (voiceMembers.get(mod.user_id) || now)
    const voiceTime = Util.parseFilteredTimeArray(
      (mod.voice_time || 0) * 1e3 + actualVoiceTime
    ).join(' ')

    const embed: MessageEmbedOptions = {
      color: config.meta.defaultColor,
      title: `Статистика модератора | ${targetMember.user.tag}`,
      description: `\`\`\`\nКол-во дней в стаффе - ${staffDays.toLocaleString(
        'ru-RU'
      )}\`\`\``,
      thumbnail: { url: targetMember.user.displayAvatarURL({ dynamic: true }) },
      fields: [
        {
          name: '<:ticket:781989625169313813> Тикеты:',
          value: `За неделю: \`${closedTickets.length.toLocaleString(
            'ru-RU'
          )}\`;`,
          inline: true
        },
        {
          name: '<:clock:781992213734883399> Голосовой:',
          value: `За неделю: \`${voiceTime}\``,
          inline: true
        },
        {
          name: '<:balls:782014392002543636> Баллы:',
          value: `За неделю: \`${totalScore.toLocaleString('ru-RU')}\`;`,
          inline: true
        },
        {
          name: '<:rank:782013186538209341> Ранг:',
          value: `Общее: \`${mod.rank.toLocaleString('ru-RU')}\`;`,
          inline: true
        },
        {
          name: '<:warn:691712893003104276> Выговор:',
          value: `Общее: \`${rebukes.length.toLocaleString('ru-RU')}\`;`,
          inline: true
        }
      ]
    }

    if (targetMember.id !== message.author.id) {
      embed.author = {
        name: message.author.tag,
        icon_url: message.author.displayAvatarURL({ dynamic: true })
      }
    }

    message.channel.send({ embed }).catch(() => {})
  }
}
