import { ClientUser, TextChannel } from 'discord.js'

import client from '../main'
import * as Util from '../utils/util'
import * as config from '../config'

import { ChatMute, Punishment } from '../utils/db'

export interface ChatMuteData {
  userID: string
  moderID: string
  guildID?: string
  duration?: number
  reason?: string
}

export interface ChatUnmuteData {
  userID: string
  moderID?: string
  guildID?: string
  reason?: string
}

export default class ChatMuteManager {
  static check(interval: number = config.ticks.checkInterval) {
    ChatMute.filter(d => d.endTick && d.endTick - Date.now() < interval)
      .then(data => [...data.values()])
      .then(docs => {
        for (const doc of docs) {
          const until = doc.endTick - Date.now()
          setTimeout(() => {
            const clientUser = client.user as ClientUser
            ChatMuteManager.unmute({
              userID: doc.userID,
              moderID: clientUser.id,
              guildID: client.guild.id
            })
          }, until)
        }
      })
  }

  static async mute(data: ChatMuteData) {
    const guild = client.guilds.cache.get(data.guildID || '') || client.guild
    const reason = data.reason || 'Не указана'

    if (!data.userID) throw new TypeError('UserID option must be a Snowflake')

    const tick = Date.now()
    const clientUser = client.user as ClientUser
    const [muteDoc, targetMember] = await Promise.all([
      ChatMute.getOne({ userID: data.userID }),
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
        setTimeout(
          ChatMuteManager.unmute.bind(null, unmuteOptions),
          data.duration
        )
      }
    }

    Punishment.insertOne({
      userID: data.userID,
      moderID: data.moderID,
      reason,
      type: config.ids.punishments.chatmute,
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
        title: `ChatMute${moderUser ? ` | ${moderUser.tag}` : ''}`,
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

    if (targetMember) targetMember.roles.add(config.ids.roles.textmute)
  }

  static async unmute(data: ChatUnmuteData) {
    const guild = client.guilds.cache.get(data.guildID || '') || client.guild
    const reason = data.reason || 'Не указана'

    if (!data.userID) throw new TypeError('UserID option must be a Snowflake')

    ChatMute.deleteOne({ userID: data.userID })

    const logsCh = client.channels.cache.get(
      config.ids.channels.text.punishLogs
    ) as TextChannel
    if (logsCh) {
      const targetUser = client.users.cache.get(data.userID)
      const moderUser = client.users.cache.get(data.moderID || '')
      const embed = {
        color: config.meta.defaultColor,
        title: `ChatUnmute${moderUser ? ` | ${moderUser.tag}` : ''}`,
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
    if (targetMember) targetMember.roles.remove(config.ids.roles.textmute)
  }
}
