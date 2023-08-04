import { Message } from 'discord.js'

import SupportUser from '../../models/supportUser'

import * as Util from '../../utils/util'
import * as config from '../../config'

import Command, { CommandParams } from '../../structures/Command'

export default class extends Command {
  get options() {
    return { name: 'закрыть доступ' }
  }

  get cOptions() {
    return {
      suppressArgs: true,
      allowedRoles: config.access.commands.closeTicketAccess
    }
  }

  async execute(message: Message, args: string[], { guild }: CommandParams) {
    const sendError = (content: string) => {
      const embed = { color: config.meta.defaultColor, description: content }
      message.channel
        .send({ embed })
        .then(msg => msg.delete({ timeout: config.ticks.errMsgDeletion }))
        .catch(() => {})
    }

    const targetMember = await Util.resolveMember(args.shift() || '', guild)
    if (!targetMember) {
      sendError('Участник не найден')
      return
    }
    if (targetMember.id === message.author.id) {
      sendError('Нельзя заблокировать доступ себе')
      return
    }

    const doc = await SupportUser.getOne({ user_id: targetMember.id })
    doc.ticket_access = false
    doc.save()
  }
}
