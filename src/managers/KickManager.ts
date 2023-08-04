import fetch from 'node-fetch'
import { ClientUser, TextChannel } from 'discord.js'

import client from '../main'
import * as config from '../config'

import { Punishment } from '../utils/db'

export interface KickData {
  userID: string
  moderID: string
  guildID?: string
  reason?: string
}

export default class KickManager {
  static async kick(data: KickData) {
    const guildID = data.guildID || client.guild.id
    const reason = data.reason || 'Не указана'

    if (!data.userID) throw new TypeError('UserID option must be a Snowflake')

    const tick = Date.now()
    const clientUser = client.user as ClientUser

    Punishment.insertOne({
      userID: data.userID,
      moderID: data.moderID,
      reason,
      type: config.ids.punishments.kick,
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
        title: `Кик${moderUser ? ` | ${moderUser.tag}` : ''}`,
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

    return fetch(
      `https://discord.com/api/v7/guilds/${guildID}/members/${data.userID}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `${clientUser.bot ? 'Bot ' : ''}${client.token}`
        }
      }
    ).catch(() => {})
  }
}
