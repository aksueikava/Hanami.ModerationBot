import {
  Message,
  TextChannel,
  MessageReaction,
  MessageEmbedOptions
} from 'discord.js'

import client from '../../main'
import Ticket from '../../models/ticket'
import Moderator from '../../models/moderator'

import Command, { CommandParams } from '../../structures/Command'

import * as Util from '../../utils/util'
import * as config from '../../config'

export default class extends Command {
  get options() {
    return { name: 'завершить' }
  }

  async execute(message: Message, _: string[], { member }: CommandParams) {
    if (message.channel.type !== 'dm') return

    const some = (id: string) => member.roles.cache.has(id)
    if (!config.meta.modRoles.some(some)) return

    const activeTicket = await Ticket.findOne({
      status: config.ids.ticketStatuses.active,
      moder_id: message.author.id
    })

    // Moderator has an active ticket
    if (!activeTicket) return

    activeTicket.status = config.ids.ticketStatuses.closed
    activeTicket.end_tick = Date.now()
    activeTicket.save()

    const endEmbed: MessageEmbedOptions = {
      color: config.meta.defaultColor,
      title: '⠀⠀⠀⠀Успешно закрыт тикет!⠀⠀⠀⠀',
      fields: [
        { name: 'Администратор', value: String(message.author) },
        {
          name: 'Пользователь',
          value: `<@${activeTicket.author_id}>`,
          inline: true
        },
        {
          name: 'Время ответа',
          value: `<:vopros:779039474486083644>\`${Util.parseFilteredTimeArray(
            activeTicket.end_tick - activeTicket.start_tick
          ).join(' ')}\``,
          inline: true
        },
        {
          name: 'Оценка',
          value: '\u200b',
          inline: true
        }
      ],
      timestamp: Date.now()
    }

    let logMsg: Message | null
    const logChannel = client.channels.cache.get(
      config.ids.channels.text.ticketLogs
    ) as TextChannel | undefined
    if (logChannel) {
      logMsg = await logChannel.send({ embed: endEmbed }).catch(() => null)
    }

    const endMsg = await message.channel
      .send({ embed: endEmbed })
      .catch(() => null)

    const user = await client.users
      .fetch(activeTicket.author_id)
      .catch(() => {})
    if (!user) return

    user
      .send({
        embed: {
          color: config.meta.defaultColor,
          title: 'Вопрос закрыт',
          description:
            'Диалог завершен, спасибо за обращение. Вы можете оценить оказанную помощь, нажав на реакцию ниже.\n<a:ETvopros:569154500305354752> Если вы будете намеренно занижать оценки - доступ к поддержке будет для Вас закрыт!'
        }
      })
      .then(msg => {
        return Util.getReaction(
          msg,
          config.meta.emojis.supportAssessment,
          user
        ).then(res => [res, msg] as [MessageReaction | null, Message])
      })
      .then(([res, msg]): any => {
        if (!res) return msg.delete().catch(() => {})

        msg.delete().catch(() => {})
        msg.channel
          .send({
            embed: {
              color: config.meta.defaultColor,
              description: 'Спасибо за оценку службы поддержки!'
            }
          })
          .catch(() => {})

        const emojiIndex = config.meta.emojis.supportAssessment.findIndex(e => {
          return e === (res.emoji.id || res.emoji.name)
        })
        const assessment = emojiIndex + 1
        if (assessment < 1) return

        if (endEmbed.fields) {
          endEmbed.fields[endEmbed.fields.length - 1].value = String(res.emoji)
        }

        if (endMsg) endMsg.edit({ embed: endEmbed }).catch(() => {})
        if (logMsg) logMsg.edit({ embed: endEmbed }).catch(() => {})

        Moderator.getOne({ user_id: message.author.id }).then(mod => {
          mod.score += assessment * 0.5
          mod.save()
        })

        activeTicket.assessment = assessment
        activeTicket.save()
      })
      .catch(() => {})
  }
}
