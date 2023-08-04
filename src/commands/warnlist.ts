import { User as DiscordUser, Message, TextChannel } from 'discord.js'

import Pages from '../structures/Pages'
import client from '../main'

import * as Util from '../utils/util'
import * as config from '../config'

import { Warn } from '../utils/db'
import { default as Command, CommandParams } from '../structures/Command'

export default class WarnlistCommand extends Command {
  get cOptions() {
    return { allowedRoles: config.access.commands.warnlist }
  }

  async execute(message: Message, _: string[], { guild }: CommandParams) {
    const warns = await Warn.getData()

    const skippedIds: { [key: string]: boolean } = {}
    const targets: { [id: string]: { user: DiscordUser; count: number } } = {}
    for (const warn of [...warns.values()]) {
      if (!targets[warn.userID] && !skippedIds[warn.userID]) {
        const user = client.users.cache.get(warn.userID)
        if (user) {
          targets[warn.userID] = {
            user,
            count: 1
          }
        } else {
          skippedIds[warn.userID] = true
        }
      } else {
        targets[warn.userID].count += 1
      }
    }

    const sortedWarns = Object.values(targets).sort((b, a) => a.count - b.count)

    const splittedWarns = Util.splitArray(
      sortedWarns.map((w, i) => {
        return `${i + 1}. **${w.user.tag}** [**\`${
          w.user.id
        }\`**] | \`${w.count.toLocaleString('ru-RU')}\``
      }),
      config.meta.warnlistPageSize
    )

    const embed = {
      color: config.meta.defaultColor,
      title: `Варнлист | ${guild.name}`
    }
    const pages: any[] = splittedWarns.map((e, i) => {
      return {
        embed: {
          ...embed,
          description: e.join('\n') || '\u200B',
          footer: {
            text: `Страница ${i + 1}/${splittedWarns.length}`,
            icon_url: guild.iconURL({ dynamic: true })
          }
        }
      }
    })
    if (pages.length < 1) pages.push({ embed })

    new Pages(pages).send(message.channel as TextChannel, message.author)
  }
}
