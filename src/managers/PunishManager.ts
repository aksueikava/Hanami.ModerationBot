import fetch from 'node-fetch'
import { MessageOptions, TextChannel, ClientUser } from 'discord.js'

import client from '../main'
import BanManager from './BanManager'
import WarnManager from './WarnManager'
import KickManager from './KickManager'
import MuteManager from './MuteManager'
import ChatMuteManager from './ChatMuteManager'
import JumpMuteManager from './JumpMuteManager'

import * as config from '../config'
import { PunishRequest } from '../utils/db'

export interface RequestData {
  message: MessageOptions
  userID: string
  guildID: string
  moderID: string
  duration?: number
  reason: string
  type: number
}

export interface PacketData {
  user_id: string
  guild_id?: string
  channel_id: string
  message_id: string
  emoji: { name: string; id?: string }
}

export default class PunishManager {
  static get actions() {
    return {
      [config.ids.punishments.ban]: PunishManager.ban,
      [config.ids.punishments.unban]: PunishManager.unban,
      [config.ids.punishments.warn]: PunishManager.warn,
      [config.ids.punishments.revokewarn]: PunishManager.revokeWarn,
      [config.ids.punishments.kick]: PunishManager.kick,
      [config.ids.punishments.mute]: PunishManager.mute,
      [config.ids.punishments.unmute]: PunishManager.unmute,
      [config.ids.punishments.chatmute]: PunishManager.chatmute,
      [config.ids.punishments.chatunmute]: PunishManager.chatunmute,
      [config.ids.punishments.jumpmute]: PunishManager.jumpmute,
      [config.ids.punishments.jumpunmute]: PunishManager.jumpunmute
    }
  }

  static get actionAccess() {
    return {
      [config.ids.punishments.ban]: [
        config.ids.roles.ogma,
        config.ids.roles.orion,
        config.ids.roles.sirius,
        config.ids.roles.astral
      ],
      [config.ids.punishments.warn]: [
        config.ids.roles.ogma,
        config.ids.roles.orion,
        config.ids.roles.sirius,
        config.ids.roles.astral
      ],
      [config.ids.punishments.revokewarn]: [
        config.ids.roles.ogma,
        config.ids.roles.orion,
        config.ids.roles.sirius
      ],
      [config.ids.punishments.kick]: [
        config.ids.roles.ogma,
        config.ids.roles.orion,
        config.ids.roles.sirius,
        config.ids.roles.astral
      ],
      [config.ids.punishments.mute]: [
        config.ids.roles.ogma,
        config.ids.roles.orion,
        config.ids.roles.sirius
      ],
      [config.ids.punishments.unmute]: [
        config.ids.roles.ogma,
        config.ids.roles.orion,
        config.ids.roles.sirius
      ],
      [config.ids.punishments.chatmute]: [
        config.ids.roles.ogma,
        config.ids.roles.orion,
        config.ids.roles.sirius
      ],
      [config.ids.punishments.chatunmute]: [
        config.ids.roles.ogma,
        config.ids.roles.orion,
        config.ids.roles.sirius
      ],
      [config.ids.punishments.jumpmute]: [
        config.ids.roles.ogma,
        config.ids.roles.orion,
        config.ids.roles.sirius
      ],
      [config.ids.punishments.jumpunmute]: [
        config.ids.roles.ogma,
        config.ids.roles.orion,
        config.ids.roles.sirius
      ]
    }
  }

  static get bans() {
    return BanManager
  }
  static get warns() {
    return WarnManager
  }
  static get kicks() {
    return KickManager
  }
  static get mutes() {
    return MuteManager
  }
  static get chatmutes() {
    return ChatMuteManager
  }
  static get jumpmutes() {
    return JumpMuteManager
  }

  static get ban() {
    return PunishManager.bans.ban
  }
  static get unban() {
    return PunishManager.bans.unban
  }

  static get warn() {
    return PunishManager.warns.warn
  }
  static get revokeWarn() {
    return PunishManager.warns.revokeWarn
  }

  static get kick() {
    return PunishManager.kicks.kick
  }

  static get mute() {
    return PunishManager.mutes.mute
  }
  static get unmute() {
    return PunishManager.mutes.unmute
  }

  static get chatmute() {
    return PunishManager.chatmutes.mute
  }
  static get chatunmute() {
    return PunishManager.chatmutes.unmute
  }

  static get jumpmute() {
    return PunishManager.jumpmutes.mute
  }
  static get jumpunmute() {
    return PunishManager.jumpmutes.unmute
  }

  static async handlePacket(data: PacketData) {
    if (!data.guild_id) return

    const emojiID = data.emoji.id || data.emoji.name
    const emojis = [config.emojis.verification, config.emojis.fail]
    if (!emojis.includes(emojiID)) return

    const guild = client.guilds.cache.get(data.guild_id)
    if (!guild) return

    const member = await guild.members.fetch(data.user_id)
    if (!member) return

    if (data.channel_id !== config.ids.channels.text.punishConfirm) return

    PunishRequest.findOne({
      messageID: data.message_id
    }).then(punishRequest => {
      if (!punishRequest) return

      const action = PunishManager.actions[punishRequest.type]
      if (!action) return

      const actionAccess = PunishManager.actionAccess[punishRequest.type]
      if (
        actionAccess &&
        !actionAccess.some(id => member.roles.cache.has(id))
      ) {
        return
      }

      PunishRequest.deleteOne({ messageID: data.message_id })

      const clientUser = client.user as ClientUser
      fetch(
        `https://discord.com/api/v7/channels/${data.channel_id}/messages/${data.message_id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `${clientUser.bot ? 'Bot ' : ''}${client.token}`
          }
        }
      ).catch(() => {})

      if (emojiID !== config.emojis.verification) return

      action({
        userID: punishRequest.userID,
        moderID: punishRequest.moderID,
        guildID: punishRequest.guildID,
        duration: punishRequest.duration,
        reason: punishRequest.reason
      })
    })
  }

  static request(data: RequestData) {
    const channel = client.channels.cache.get(
      config.ids.channels.text.punishConfirm
    ) as TextChannel

    channel
      .send(data.message)
      .then(msg => Array.isArray(msg) ? msg[msg.length - 1] : msg)
      .then(msg => {
        PunishRequest.insertOne({
          userID: data.userID,
          guildID: data.guildID,
          messageID: msg.id,
          duration: data.duration || undefined,
          moderID: data.moderID || undefined,
          reason: data.reason || undefined,
          type: data.type,
          tick: Date.now()
        })
        return msg
      })
      .then(msg => msg.react(config.emojis.verification).then(() => msg))
      .then(msg => msg.react(config.emojis.fail))
      .catch(() => {})
  }

  static check(interval: number = config.ticks.checkInterval) {
    PunishManager.bans.check(interval)
    PunishManager.warns.check(interval)
    PunishManager.mutes.check(interval)
    PunishManager.chatmutes.check(interval)
    PunishManager.jumpmutes.check(interval)
  }
}
