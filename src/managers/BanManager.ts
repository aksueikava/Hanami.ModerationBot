import fetch from 'node-fetch'
import { ClientUser, TextChannel } from 'discord.js'

import client from '../main'
import * as Util from '../utils/util'
import * as config from '../config'

import { Ban, Punishment } from '../utils/db'

export interface BanData {
  userID: string
  moderID: string
  guildID?: string
  duration?: number
  reason?: string
}

export interface UnbanData {
  userID: string
  moderID?: string
  guildID?: string
  duration?: number
  reason?: string
}

export default class BanManager {
  static check(interval: number = config.ticks.checkInterval) {
    Ban.filter(d => d.endTick && d.endTick - Date.now() < interval)
      .then(data => [...data.values()])
      .then(docs => {
        for (const doc of docs) {
          const until = doc.endTick - Date.now()
          setTimeout(() => {
            const clientUser = client.user as ClientUser
            BanManager.unban({
              userID: doc.userID,
              moderID: clientUser.id,
              guildID: client.guild.id
            })
          }, until)
        }
      })
  }

  static async ban(data: BanData) {
    const guildID = data.guildID || client.guild.id
    const reason = data.reason || 'Не указана'

    if (!data.userID) throw new TypeError('UserID option must be a Snowflake')

    const tick = Date.now()
    const clientUser = client.user as ClientUser
    if (typeof data.duration === 'number') {
      const banDoc = await Ban.getOne({ userID: data.userID })

      banDoc.endTick = Date.now() + data.duration
      banDoc.tick = tick
      banDoc.save()

      if (data.duration < config.ticks.checkInterval) {
        const unbanOptions = {
          userID: data.userID,
          moderID: clientUser.id,
          guildID
        }
        setTimeout(BanManager.unban.bind(null, unbanOptions), data.duration)
      }
    }

    Punishment.insertOne({
      userID: data.userID,
      moderID: data.moderID,
      reason,
      type: config.ids.punishments.ban,
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
        title: `Ban${moderUser ? ` | ${moderUser.tag}` : ''}`,
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

    return fetch(
      `https://discord.com/api/v7/guilds/${guildID}/bans/${data.userID}`,
      {
        method: 'PUT',
        body: JSON.stringify({ reason }),
        headers: {
          Authorization: `${clientUser.bot ? 'Bot ' : ''}${client.token}`,
          'Content-Type': 'application/json'
        }
      }
    ).catch(() => {})
  }

  static unban(data: UnbanData) {
    const guildID = data.guildID || client.guild.id
    const reason = data.reason || 'Не указана'

    if (!data.userID) throw new TypeError('UserID option must be a Snowflake')

    Ban.deleteOne({ userID: data.userID })

    const logsCh = client.channels.cache.get(
      config.ids.channels.text.punishLogs
    ) as TextChannel
    if (logsCh) {
      const targetUser = client.users.cache.get(data.userID)
      const moderUser = client.users.cache.get(data.moderID || '')
      const embed = {
        color: config.meta.defaultColor,
        title: `Unban${moderUser ? ` | ${moderUser.tag}` : ''}`,
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

    const clientUser = client.user as ClientUser
    return fetch(
      `https://discord.com/api/v7/guilds/${guildID}/bans/${data.userID}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `${clientUser.bot ? 'Bot ' : ''}${client.token}`
        }
      }
    ).catch(() => {})
  }
}
