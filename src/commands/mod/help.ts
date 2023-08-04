import {
  Message,
  TextChannel,
  SnowflakeUtil,
  MessageEmbedOptions
} from 'discord.js'

import client from '../../main'
import Ticket from '../../models/ticket'
import SupportUser from '../../models/supportUser'

import * as Util from '../../utils/util'
import * as config from '../../config'

import Command, { CommandParams } from '../../structures/Command'

export default class extends Command {
  get options() {
    return { name: 'помощь' }
  }

  async execute(message: Message, args: string[], { member }: CommandParams) {
    // if (![config.ids.channels.text.flood].includes(message.channel.id)) return

    const sendError = (content: string) => {
      const embed = { color: config.meta.defaultColor, description: content }
      message.channel
        .send({ embed })
        .then(msg => msg.delete({ timeout: config.ticks.errMsgDeletion }))
        .catch(() => {})
    }

    const supportUserDoc = await SupportUser.getOne({
      user_id: message.author.id
    })
    if (!supportUserDoc.support_access) {
      return sendError('Доступ к поддержке ограничен')
    }

    const pendingTicket = await Ticket.findOne(t => {
      return (
        t.author_id === message.author.id &&
        [
          config.ids.ticketStatuses.verification,
          config.ids.ticketStatuses.pending
        ].includes(t.status as number)
      )
    })
    if (pendingTicket) {
      return sendError(
        'Вы уже отправили обращение, наберитесь терпения и дождитесь ответа.'
      )
    }

    const activeTicket = await Ticket.findOne({
      author_id: message.author.id,
      status: config.ids.ticketStatuses.active
    })
    if (activeTicket) {
      return sendError('У вас уже имеется активный диалог с поддержкой.')
    }

    const text = args.join(' ')
    if (text.length < 1) return sendError('Опишите свою проблему')

    const channel = client.channels.cache.get(
      config.ids.channels.text.ticketApproval
    ) as TextChannel | undefined
    if (!channel) return sendError('Канал не найден')

    const channelType = member.voice.channel ? 1 : 0
    const channelID = member.voice.channelID || message.channel.id

    const embed: MessageEmbedOptions = {
      color: config.meta.defaultColor,
      title: '⠀⠀⠀⠀⠀⠀⠀⠀⠀Новый тикет⠀⠀⠀⠀⠀⠀⠀⠀⠀',
      description: `> ${text}`,
      fields: [
        { name: 'Автор', value: String(message.author), inline: true },
        {
          name: `Отправлен с ${
            ['текстового', 'голосового'][channelType]
          } канала`,
          value: `<#${channelID}>`,
          inline: true
        }
      ],
      footer: {
        text: message.author.tag,
        icon_url: message.author.displayAvatarURL({ dynamic: true })
      },
      timestamp: Date.now()
    }

    const msg = await channel.send({ embed }).catch(() => {})
    if (!msg) return sendError('Не удалось отправить сообщение')
    ;(async () => {
      try {
        const emojis = [...Object.keys(config.helpRoles), config.emojis.fail]
        for (const emoji of emojis) {
          await Util.react(msg, emoji)
        }
      } catch (_) {}
    })()

    message.author.send({
      embed: {
        color: config.meta.defaultColor,
        description:
          'Ваше обращение будет доставлено нашим администраторам, ожидайте.'
      }
    })

    Ticket.insertOne({
      id: SnowflakeUtil.generate(Date.now()),
      text,
      status: config.ids.ticketStatuses.verification,
      author_id: message.author.id,
      message_id: msg.id,
      channel_id: channelID,
      channel_type: channelType
    })
  }
}
