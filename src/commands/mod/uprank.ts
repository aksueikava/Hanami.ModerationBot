import { Message } from 'discord.js'

import Command, { CommandParams } from '../../structures/Command'

import * as Util from '../../utils/util'
import * as config from '../../config'

export default class extends Command {
  get options() {
    return {
      name: 'повыситьранг',
      requiredRoles: [config.ids.roles.ogma, config.ids.roles.orion]
    }
  }

  async execute(_message: Message, args: string[], { guild }: CommandParams) {
    const targetID = Util.resolveUserID(args[0])
    if (!targetID) return

    const targetMember = await guild.members.fetch(targetID).catch(() => null)
    if (!targetMember) return

    Util.uprankModerator(targetMember)
  }
}
