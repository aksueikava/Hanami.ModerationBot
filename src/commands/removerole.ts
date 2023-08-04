import { Message } from 'discord.js'

import * as Util from '../utils/util'
import * as config from '../config'

import { default as Command, CommandParams } from '../structures/Command'

export default class RemoveRoleCommand extends Command {
  get cOptions() {
    return {
      suppressArgs: true,
      allowedRoles: config.access.commands.removerole
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

    const targetMember = await Util.resolveMember(args[0], guild)
    if (!targetMember) {
      sendError('Участник не найден')
      return
    }

    const role = Util.resolveRole(args[1], guild)
    if (!role) {
      sendError('Роль не найдена')
      return
    }

    if (config.meta.permanentlyUnremovableRoles.includes(role.id)) {
      sendError('Указанную роль нельзя снять')
      return
    }
    if (
      !member.roles.cache.has(config.ids.roles.orion) &&
      config.meta.unremovableRoles.includes(role.id)
    ) {
      sendError('Указанную роль нельзя снять')
      return
    }

    targetMember.roles.remove(role.id).catch(() => {})
  }
}
