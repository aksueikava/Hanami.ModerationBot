import * as moment from 'moment-timezone'
import { Message, TextChannel } from 'discord.js'

import Pages from '../structures/Pages'

import * as Util from '../utils/util'
import * as config from '../config'

import { Punishment, Warn } from '../utils/db'
import { default as Command, CommandParams } from '../structures/Command'

export default class LoreCommand extends Command {
  get options() {
    return { name: 'история' }
  }

  async execute(message: Message, _: string[], { member }: CommandParams) {
    const targetMember = member

    const [warnData, punishmentData] = await Promise.all([
      Warn.filter({ userID: targetMember.id }),
      Punishment.filter({
        userID: targetMember.id
      })
    ])

    const warns = [...warnData.values()].sort((b, a) => a.tick - b.tick)
    const punishments = [...punishmentData.values()]

    const embedDescriptionLines = [
      `На данный момент \`${warns.length}\` ${Util.pluralNoun(
        warns.length,
        'варн',
        'варна',
        'варнов'
      )}`
    ]

    if (warns[0]) {
      const twoWeeksMS = 1.2096e9 // 2 weeks
      const difference = warns[0].tick + twoWeeksMS - Date.now()

      embedDescriptionLines.push(
        `> Время до истечения ${
          warns.length
        }-го варна \`${Util.parseFilteredTimeArray(difference).join(' ')}\``,
        ''
      )
    }

    const banCount = punishments.filter(p => {
      return p.type === config.ids.punishments.ban
    }).length
    const muteCount = punishments.filter(p => {
      return p.type === config.ids.punishments.mute
    }).length
    const warnCount = punishments.filter(p => {
      return p.type === config.ids.punishments.warn
    }).length
    const footer = `За все время \`${muteCount.toLocaleString(
      'ru-RU'
    )}\` ${Util.pluralNoun(
      muteCount,
      'мут',
      'мута',
      'мутов'
    )}, \`${warnCount.toLocaleString('ru-RU')}\` ${Util.pluralNoun(
      warnCount,
      'варн',
      'варна',
      'варнов'
    )}, \`${banCount.toLocaleString('ru-RU')}\` ${Util.pluralNoun(
      banCount,
      'бан',
      'бана',
      'банов'
    )}`

    if (punishments.length < 1) {
      message.channel
        .send({
          embed: {
            color: config.meta.defaultColor,
            thumbnail: {
              url: targetMember.user.displayAvatarURL({ dynamic: true })
            },
            title: `История нарушений | ${targetMember.user.tag}`,
            description: embedDescriptionLines.join('\n'),
            footer: { text: footer }
          }
        })
        .catch(() => {})
      return
    }

    const pages = Util.splitArray(punishments, config.meta.lorePageSize).map(
      punishes => {
        return {
          fields: [
            {
              name: 'Тип/Дата',
              value: punishes.map(
                p =>
                  `${Util.resolveEmoji(
                    config.meta.emojis.punishment[p.type]
                  )}|${moment(p.tick)
                    .tz(config.meta.defaultTimezone)
                    .locale('ru-RU')
                    .format('DDMMM YYYY')}`
              ),
              inline: true
            },
            {
              name: 'Пункт/Администратор',
              value: punishes.map(p => `|\`${p.reason}\`| <@${p.moderID}>`),
              inline: true
            }
          ]
        }
      }
    )
    new Pages(pages).send(message.channel as TextChannel, message.author)
  }
}
