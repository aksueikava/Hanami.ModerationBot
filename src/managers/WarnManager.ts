import { ClientUser, TextChannel } from 'discord.js'

import client from '../main'
import PunishManager from './PunishManager'

import * as Util from '../utils/util'
import * as config from '../config'

import { Warn, Punishment } from '../utils/db'

export interface WarnData {
  userID: string
  moderID: string
  guildID?: string
  reason?: string
}

export interface RevokeWarnData {
  userID: string
  moderID?: string
  guildID?: string
  reason?: string
}

export default class WarnManager {
  static check(interval: number = config.ticks.checkInterval) {
    Warn.filter(d => {
      return d.tick && d.tick + config.ticks.warnTime - Date.now() < interval
    })
      .then(data => [...data.values()])
      .then(docs => {
        for (const doc of docs) {
          const until = doc.tick + config.ticks.warnTime - Date.now()
          setTimeout(() => {
            const clientUser = client.user as ClientUser
            WarnManager.revokeWarn({
              userID: doc.userID,
              moderID: clientUser.id,
              guildID: client.guild.id
            })
          }, until)
        }
      })
  }

  static async warn(data: WarnData) {
    const guild = client.guilds.cache.get(data.guildID || '') || client.guild
    const reason = data.reason || 'Не указана'
    const duration = config.ticks.warnTime

    if (!data.userID) throw new TypeError('UserID option must be a Snowflake')

    const tick = Date.now()
    const [warnDoc, targetMember, warnDocCount] = await Promise.all([
      Warn.getOne({ userID: data.userID, tick: tick, endTick: Date.now() + config.ticks.warnTime }),
      guild.members.fetch(data.userID),
      Object.keys(await Warn.filter({ userID: data.userID })).length
    ])
    warnDoc.save()

    Punishment.insertOne({
      userID: data.userID,
      moderID: data.moderID,
      reason,
      type: config.ids.punishments.warn,
      tick
    })

    const logsCh = client.channels.cache.get(
      config.ids.channels.text.punishLogs
    ) as TextChannel
    if (logsCh) {
      const targetUser = client.users.cache.get(data.userID)
      const moderUser = client.users.cache.get(data.moderID)
      const embed = {
        color: config.meta.defaultColor,
        title: `Warn${moderUser ? ` | ${moderUser.tag}` : ''}`,
        description: `**Причина**\n>>> ${reason}`,
        fields: [
          {
            name: 'Пользовать',
            value: `${targetUser ? targetUser.tag : '\u200b'}`,
            inline: true
          },
          {
            name: 'Время',
            value: `${typeof duration === 'number'
              ? Util.parseFilteredTimeArray(duration, {
                nouns: config.meta.pluralTime
              }).join(' ')
              : 'Навсегда'
              }`,
            inline: true
          }
        ]
      }
      logsCh.send({ embed }).catch(() => { })
    }

    if (targetMember) {
      targetMember
        .send({
          embed: {
            color: config.meta.defaultColor,
            title: 'Вам выдали варн!',
            description:
              'Не огорчайтесь, варн снимается. Но, впредь больше не нарушайте правила сервера. ( ͡° ͜ʖ ͡°)'
          }
        })
        .catch(() => { })
    }

    const clientUser = client.user as ClientUser

    if (warnDocCount + 1 >= 3) {
      PunishManager.ban({
        userID: data.userID,
        guildID: guild.id,
        moderID: clientUser.id,
        duration: config.ticks.warnBanTime,
        reason: 'Has been warned 3 times'
      })
      Warn.deleteMany({ userID: data.userID })
    } else if (targetMember) {
      const roleID = config.ids.roles.warns[warnDocCount]
      if (roleID) targetMember.roles.add(roleID).catch(() => { })
    }
  }

  static async revokeWarn(data: RevokeWarnData) {
    const guild = client.guilds.cache.get(data.guildID || '') || client.guild
    const reason = data.reason || 'Не указана'

    if (!data.userID) throw new TypeError('UserID option must be a Snowflake')

    const [targetMember, warnData] = await Promise.all([
      guild.members.fetch(data.userID),
      Warn.filter({ userID: data.userID })
    ])

    const warnDocs = [...warnData.values()]
    const firstDoc = warnDocs.sort((a, b) => (a.tick || 0) - (b.tick || 0))[0]

    const logsCh = client.channels.cache.get(
      config.ids.channels.text.punishLogs
    ) as TextChannel
    if (logsCh) {
      const targetUser = client.users.cache.get(data.userID)
      const moderUser = client.users.cache.get(data.moderID || '')
      const embed = {
        color: config.meta.defaultColor,
        title: `Unwarn${moderUser ? ` | ${moderUser.tag}` : ''}`,
        description: `**Причина**\n>>> ${reason}`,
        fields: [
          {
            name: 'Пользовать',
            value: `${targetUser ? targetUser.tag : '\u200b'}`,
            inline: true
          }
        ]
      }
      logsCh.send({ embed }).catch(() => { })
    }

    Warn.deleteOne({
      userID: data.userID,
      ...(firstDoc ? { tick: firstDoc.tick } : {})
    })
    const roleID = config.ids.roles.warns[warnDocs.length - 1]
    if (roleID) targetMember.roles.remove(roleID).catch(() => { })
  }
}
