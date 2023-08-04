import { ClientUser, TextChannel } from 'discord.js'

import client from '../main'
import * as Util from '../utils/util'
import * as config from '../config'

import { Mute, Punishment } from '../utils/db'

export interface MuteData {
  userID: string
  moderID: string
  guildID?: string
  reason?: string
  duration?: number
}

export interface UnmuteData {
  userID: string
  moderID?: string
  guildID?: string
  reason?: string
}

export default class MuteManager {
  static check(interval: number = config.ticks.checkInterval) {
    Mute.filter(d => d.endTick && d.endTick - Date.now() < interval)
      .then(data => [...data.values()])
      .then(docs => {
        for (const doc of docs) {
          const until = doc.endTick - Date.now()
          setTimeout(() => {
            const clientUser = client.user as ClientUser
            MuteManager.unmute({
              userID: doc.userID,
              moderID: clientUser.id,
              guildID: client.guild.id
            })
          }, until)
        }
      })
  }

  static async mute(data: MuteData) {
    const guild = client.guilds.cache.get(data.guildID || '') || client.guild
    const reason = data.reason || 'Не указана'

    if (!data.userID) throw new TypeError('UserID option must be a Snowflake')

    const tick = Date.now()
    const clientUser = client.user as ClientUser
    const [muteDoc, targetMember] = await Promise.all([
      Mute.getOne({ userID: data.userID }),
      guild.members.fetch(data.userID)
    ])
    if (typeof data.duration === 'number') {
      muteDoc.endTick = Date.now() + data.duration
      muteDoc.tick = tick
      muteDoc.save()

      if (data.duration < config.ticks.checkInterval) {
        const unmuteOptions = {
          userID: data.userID,
          moderID: clientUser.id,
          guildID: guild.id
        }
        setTimeout(MuteManager.unmute.bind(null, unmuteOptions), data.duration)
      }
    }

    Punishment.insertOne({
      userID: data.userID,
      moderID: data.moderID,
      reason,
      type: config.ids.punishments.mute,
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
        title: `Mute${moderUser ? ` | ${moderUser.tag}` : ''}`,
        description: `**Причина**\n>>> ${reason}`,
        fields: [
          {
            name: 'Пользовать',
            value: `${targetUser ? targetUser.tag : '\u200b'}`,
            inline: true
          },
          {
            name: 'Время',
            value: `${
              typeof data.duration === 'number'
                ? Util.parseFilteredTimeArray(data.duration, {
                    nouns: config.meta.pluralTime
                  }).join(' ')
                : 'Навсегда'
            }`,
            inline: true
          }
        ]
      }
      logsCh.send({ embed }).catch(() => {})
    }

    if (targetMember) {
      targetMember.voice.setMute(true).catch(() => {})
      targetMember.roles.add(config.ids.roles.mute)
    }
  }

  static async unmute(data: UnmuteData) {
    const guild = client.guilds.cache.get(data.guildID || '') || client.guild
    const reason = data.reason || 'Не указана'

    if (!data.userID) throw new TypeError('UserID option must be a Snowflake')

    Mute.deleteOne({ userID: data.userID })

    const logsCh = client.channels.cache.get(
      config.ids.channels.text.punishLogs
    ) as TextChannel
    if (logsCh) {
      const targetUser = client.users.cache.get(data.userID)
      const moderUser = client.users.cache.get(data.moderID || '')
      const embed = {
        color: config.meta.defaultColor,
        title: `Unmute${moderUser ? ` | ${moderUser.tag}` : ''}`,
        description: `**Причина**\n>>> ${reason}`,
        fields: [
          {
            name: 'Пользовать',
            value: `${targetUser ? targetUser.tag : '\u200b'}`,
            inline: true
          }
        ]
      }
      logsCh.send({ embed }).catch(() => {})
    }

    const targetMember = await guild.members.fetch(data.userID)
    if (targetMember) {
      targetMember.voice.setMute(false).catch(() => {})
      targetMember.roles.remove(config.ids.roles.mute)
    }
  }
}
