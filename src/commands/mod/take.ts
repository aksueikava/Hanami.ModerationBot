import { Message } from 'discord.js'

import Ticket from '../../models/ticket'

import Command, { CommandParams } from '../../structures/Command'

import * as config from '../../config'

export default class extends Command {
  get options() {
    return { name: 'взять' }
  }

  async execute(message: Message, args: string[], { member }: CommandParams) {
    if (message.channel.type !== 'dm') return

    const some = (id: string) => member.roles.cache.has(id)
    if (!config.meta.modRoles.some(some)) return

    const activeTicket = await Ticket.findOne({
      status: config.ids.ticketStatuses.active,
      moder_id: message.author.id
    })

    // Moderator has an active ticket
    if (activeTicket) return

    const captcha = args.join(' ')
    const ticket = await Ticket.findOne(t => {
      return (
        t.captcha === captcha &&
        [
          config.ids.ticketStatuses.active,
          config.ids.ticketStatuses.pending
        ].includes(t.status as number)
      )
    })

    // Pending ticket not found
    if (!ticket) {
      return message.channel
        .send({
          embed: {
            color: config.meta.defaultColor,
            description: 'Тикет не найден'
          }
        })
        .catch(() => {})
    }

    // Ticket already taken
    if (typeof ticket.moder_id === 'string') {
      return message.channel
        .send({
          embed: {
            color: config.meta.defaultColor,
            description: 'Тикет взят другим модератором'
            // description: 'Тикет в обработке'
          }
        })
        .catch(() => {})
    }

    ticket.status = config.ids.ticketStatuses.active
    ticket.moder_id = message.author.id
    ticket.start_tick = Date.now()
    ticket.save()

    message.author
      .send({
        embed: {
          color: config.meta.defaultColor,
          description: 'Диалог успешно начат.'
        }
      })
      .catch(() => {})

    const user = await this.client.users.fetch(ticket.author_id).catch(() => {})
    if (!user) return

    user
      .send({
        embed: {
          color: config.meta.defaultColor,
          title: 'Диалог успешно начат',
          description:
            'Спасибо за обращение в нашу службу поддержки.\nМы постараемся решить ваш вопрос!'
        }
      })
      .catch(() => {})
  }
}
