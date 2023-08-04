import { Message, Permissions, TextChannel } from 'discord.js'

import * as Util from '../utils/util'
import * as config from '../config'

import { default as Command, CommandParams } from '../structures/Command'

export default class PruneCommand extends Command {
  get cOptions() {
    return { suppressArgs: true, allowedRoles: config.access.commands.prune }
  }

  async execute(
    message: Message,
    args: string[],
    { guild, member }: CommandParams
  ) {
    const flags = Permissions.FLAGS.ADMINISTRATOR
    if (
      !member.hasPermission(flags) &&
      config.meta.unprunableChannels.includes(message.channel.id)
    ) {
      return
    }

    const sendError = (content: string) => {
      const embed = { color: config.meta.defaultColor, description: content }
      message.channel
        .send({ embed })
        .then(msg => msg.delete({ timeout: config.ticks.errMsgDeletion }))
        .catch(() => {})
    }

    const targetMember = await Util.resolveMember(args[0] || '', guild)

    if (!targetMember && !member.hasPermission(flags)) {
      sendError('Укажите участника')
      return
    }
    if (targetMember) args.shift()

    const messageCount = parseInt(args.join('').replace(/\D/g, ''))
    const channel = message.channel as TextChannel

    let msgCount = messageCount
    let msgId = message.id
    while (msgCount > 0) {
      let messages = await message.channel.messages.fetch({
        before: msgId,
        limit: 100
      })
      msgId = messages.lastKey() || msgId

      if (targetMember) {
        messages = messages.filter(m => m.author.id === targetMember.id)
      }

      const count = Math.min(msgCount, messages.size)
      if (count < 1) break

      msgCount -= count

      await channel.bulkDelete(messages.array().slice(0, count)).catch(() => {})
    }
  }
}
