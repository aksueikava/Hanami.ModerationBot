import { Message, TextChannel } from 'discord.js'

import Pages from '../structures/Pages'
import * as Util from '../utils/util'
import * as config from '../config'

import { default as Command, CommandParams } from '../structures/Command'

export default class BanlistCommand extends Command {
  get cOptions() {
    return { allowedRoles: config.access.commands.banlist }
  }

  async execute(message: Message, _: string[], { guild }: CommandParams) {
    guild.fetchBans().then(bans => {
      const splittedBans = Util.splitArray(
        [...bans.values()].map((b, i) => {
          return `${i + 1}. **${b.user.tag}** [**\`${b.user.id}\`**] | \`${
            b.reason || 'Не указана'
          }\``
        }),
        config.meta.banlistPageSize
      )

      const embed = {
        color: config.meta.defaultColor,
        title: `Банлист | ${guild.name}`
      }
      const pages: any[] = splittedBans.map((e, i) => {
        return {
          embed: {
            ...embed,
            description: e.join('\n') || '\u200B',
            footer: {
              text: `Страница ${i + 1}/${splittedBans.length}`,
              icon_url: guild.iconURL({ dynamic: true })
            }
          }
        }
      })
      if (pages.length < 1) pages.push({ embed })

      new Pages(pages).send(message.channel as TextChannel, message.author)
    })
  }
}
