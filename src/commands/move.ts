import { Message } from 'discord.js'

import * as Util from '../utils/util'
import * as config from '../config'

import { default as Command, CommandParams } from '../structures/Command'

export default class MoveCommand extends Command {
  get cOptions() {
    return { suppressArgs: true, allowedRoles: config.access.commands.move }
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

    const targetMember = await Util.resolveMember(args[0], guild)
    if (!targetMember) {
      sendError('Участник не найден')
      return
    }

    if (
      config.meta.unmovableRoles.some(id => targetMember.roles.cache.has(id))
    ) {
      sendError('Данного участника невозможно переместить')
      return
    }

    if (!targetMember.voice.channel) {
      sendError('Участник не находится в голосовом канале')
      return
    }

    const newChannel =
      Util.resolveChannel(args[1], guild) || member.voice.channel
    if (!newChannel || newChannel.type !== 'voice') {
      sendError('Голосовой канал не найден')
      return
    }

    targetMember.voice.setChannel(newChannel.id).catch(() => {})
  }
}
