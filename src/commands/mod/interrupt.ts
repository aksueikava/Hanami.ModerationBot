import { Message, MessageEmbedOptions, TextChannel } from 'discord.js'

import client from '../../main'
import Ticket from '../../models/ticket'

import Command, { CommandParams } from '../../structures/Command'

import * as Util from '../../utils/util'
import * as config from '../../config'

export default class extends Command {
  get options() {
    return { name: 'прервать' }
  }

  async execute(message: Message, _: string[], { member }: CommandParams) {
    if (message.channel.type !== 'dm') return

    const some = (id: string) => member.roles.cache.has(id)
    if (!config.meta.modRoles.some(some)) return

    const activeTicket = await Ticket.findOne({
      status: config.ids.ticketStatuses.active,
      moder_id: message.author.id
    })

    // Moderator doesn't have an active ticket
    if (!activeTicket) return

    activeTicket.status = config.ids.ticketStatuses.closed
    activeTicket.end_tick = Date.now()
    activeTicket.save()

    const user = await client.users
      .fetch(activeTicket.author_id)
      .catch(() => {})
    if (!user) return

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

    message.channel.send({ embed: endEmbed }).catch(() => {})

    const logChannel = client.channels.cache.get(
      config.ids.channels.text.ticketLogs
    ) as TextChannel | undefined
    if (logChannel) logChannel.send({ embed: endEmbed }).catch(() => {})

    user
      .send({
        embed: {
          color: config.meta.defaultColor,
          title: 'Диалог был прерван.',
          description:
            '**Кажется, агент устал ждать или что-то произошло. Впредь будьте внимательны и попробуйте отправить новый запрос!**'
        }
      })
      .catch(() => {})
  }
}
