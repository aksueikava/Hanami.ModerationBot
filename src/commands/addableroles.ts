import { Message } from 'discord.js'

import * as Util from '../utils/util'
import * as config from '../config'

import { default as Command, CommandParams } from '../structures/Command'

const roles = [
  {
    name: 'erotic',
    aliases: [],
    roleID: config.ids.roles.erotic,
    perms: config.access.commands.erotic
  },
  {
    name: 'aesthetic',
    aliases: [],
    roleID: config.ids.roles.aesthetic,
    perms: config.access.commands.aesthetic
  },
  {
    name: 'yakuza',
    aliases: [],
    roleID: config.ids.roles.yakuza,
    perms: config.access.commands.yakuza
  },
  {
    name: 'light',
    aliases: [],
    roleID: config.ids.roles.light,
    perms: config.access.commands.light
  },
  {
    name: 'night',
    aliases: [],
    roleID: config.ids.roles.night,
    perms: config.access.commands.night
  },
  {
    name: 'memes',
    aliases: [],
    roleID: config.ids.roles.memes,
    perms: config.access.commands.memes
  },
  {
    name: 'cutie',
    aliases: [],
    roleID: config.ids.roles.cutie,
    perms: config.access.commands.cutie
  },
  {
    name: 'dj',
    aliases: [],
    roleID: config.ids.roles.dj,
    perms: config.access.commands.dj
  },
  {
    name: 'cupwinner',
    aliases: [],
    roleID: config.ids.roles.cupwinner,
    perms: config.access.commands.cupwinner
  },
  {
    name: 'closemember',
    aliases: [],
    roleID: config.ids.roles.closemember,
    perms: config.access.commands.closemember
  },
  {
    name: 'symphony',
    aliases: [],
    roleID: config.ids.roles.symphony,
    perms: config.access.commands.symphony
  },
  {
    name: 'selfie',
    aliases: [],
    roleID: config.ids.roles.selfie,
    perms: config.access.commands.selfie
  },
  {
    name: 'eventban',
    aliases: [],
    roleID: config.ids.roles.eventBan,
    perms: config.access.commands.eventban
  },
  {
    name: 'ghostshell',
    aliases: [],
    roleID: config.ids.roles.ghostshell,
    perms: config.access.commands.ghostshell
  },
  {
    name: 'girl',
    aliases: [],
    roleID: config.ids.roles.gender.female,
    removals: [
      config.ids.roles.gender.male,
      config.ids.roles.gender.null,
      config.ids.roles.gender.unknown
    ],
    perms: config.access.commands.girl
  },
  {
    name: 'boy',
    aliases: [],
    roleID: config.ids.roles.gender.male,
    removals: [
      config.ids.roles.gender.female,
      config.ids.roles.gender.null,
      config.ids.roles.gender.unknown
    ],
    perms: config.access.commands.boy
  },
  {
    name: 'unknown',
    aliases: [],
    roleID: config.ids.roles.gender.unknown,
    removals: [
      config.ids.roles.gender.female,
      config.ids.roles.gender.male,
      config.ids.roles.gender.null
    ],
    perms: config.access.commands.unknown
  },
  {
    name: 'gaming person',
    aliases: [],
    roleID: config.ids.roles.gamingPerson,
    perms: config.access.commands.gamingPerson
  },
  {
    name: 'creative person',
    aliases: [],
    roleID: config.ids.roles.creativePerson,
    perms: config.access.commands.creativePerson
  }
]

const commands = roles.map(r => {
  return class AddableRoleCommand extends Command {
    get options() {
      return { name: r.name, aliases: r.aliases }
    }

    get cOptions() {
      return { allowedRoles: r.perms }
    }

    async execute(message: Message, args: string[], { guild }: CommandParams) {
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

      if (r.removals && r.removals.length > 0) {
        await targetMember.roles.remove(r.removals).catch(() => {})
      }
      targetMember.roles.add(r.roleID).catch(() => {})
    }
  }
})

export = commands
