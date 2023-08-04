import { Trigger } from 'discore.js'
import { Message, MessageEmbedOptions } from 'discord.js'

import client from '../main'
import Ticket from '../models/ticket'

import * as config from '../config'

export default class extends Trigger {
  async run(message: Message) {
    if (message.channel.type !== 'dm') return

    const tickets = await Promise.all([
      Ticket.findOne({
        author_id: message.author.id,
        status: config.ids.ticketStatuses.active
      }),
      Ticket.findOne({
        moder_id: message.author.id,
        status: config.ids.ticketStatuses.active
      })
    ])
    const ticket = tickets.find(Boolean)
    if (!ticket) return

    const recipientID =
      ticket.moder_id === message.author.id ? ticket.author_id : ticket.moder_id
    const recipient = client.users.cache.get(recipientID)
    if (!recipient) return

    const embed: MessageEmbedOptions = {
      color: config.meta.defaultColor,
      description: message.content
    }
    recipient.send({ embed }).catch(() => {})
  }
}
