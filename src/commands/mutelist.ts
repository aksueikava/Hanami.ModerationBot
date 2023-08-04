import { User as DiscordUser, Message, TextChannel } from 'discord.js'

import Pages from '../structures/Pages'
import client from '../main'

import * as Util from '../utils/util'
import * as config from '../config'

import { Mute } from '../utils/db'
import { default as Command, CommandParams } from '../structures/Command'

export default class WarnlistCommand extends Command {
  get cOptions() {
    return { allowedRoles: config.access.commands.warnlist }
  }

  async execute(message: Message, _: string[], { guild }: CommandParams) {
    const mutes = await Mute.getData()

    const targets: { [id: string]: { user: DiscordUser; reason: string } } = {}
    for (const mute of [...mutes.values()]) {
      const user = client.users.cache.get(mute.userID)
      if (user) targets[mute.userID] = { user, reason: mute.reason }
    }

    const splittedMutes = Util.splitArray(
      [...mutes.values()].map((m, i) => {
        return `${i + 1}. **${m.user.tag}** [**\`${m.user.id}\`**] | \`${
          m.reason
        }\``
      }),
      config.meta.warnlistPageSize
    )

    const embed = {
      color: config.meta.defaultColor,
      title: `Мутлист | ${guild.name}`
    }
    const pages: any[] = splittedMutes.map((e, i) => {
      return {
        embed: {
          ...embed,
          description: e.join('\n') || '\u200B',
          footer: {
            text: `Страница ${i + 1}/${splittedMutes.length}`,
            icon_url: guild.iconURL({ dynamic: true })
          }
        }
      }
    })
    if (pages.length < 1) pages.push({ embed })

    new Pages(pages).send(message.channel as TextChannel, message.author)
  }
}
