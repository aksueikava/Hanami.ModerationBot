import fetch from 'node-fetch'

import { Event } from 'discore.js'
import { ClientUser, MessageEmbedOptions, User } from 'discord.js'

import client from '../../main'
import Ticket from '../../models/ticket'
import CanvasUtil from '../../utils/Canvas'

import * as Util from '../../utils/util'
import * as config from '../../config'

export default class extends Event {
  get options() {
    return { name: 'raw' }
  }

  async run(packet: { [K: string]: any }) {
    if (packet.t !== 'MESSAGE_REACTION_ADD') return
    if (!Util.verifyWorkingGuild(packet.d.guild_id)) return

    const guild = client.guilds.cache.get(packet.d.guild_id)
    if (!guild) return

    const member = await guild.members.fetch(packet.d.user_id).catch(() => {})
    if (!member) return

    {
      const some = (id: string) => member.roles.cache.has(id)
      if (!Object.values(config.helpRoles)[0].some(some)) return
    }

    const ticket = await Ticket.findOne({
      status: config.ids.ticketStatuses.verification,
      message_id: packet.d.message_id
    })
    if (!ticket) return

    const emojis = [...Object.keys(config.helpRoles), config.emojis.fail]

    const emojiID = packet.d.emoji.id || packet.d.emoji.name
    if (!emojis.includes(emojiID)) return

    const helpRoles = config.helpRoles[emojiID as keyof typeof config.helpRoles]

    const clientUser = client.user as ClientUser

    {
      const uri = `https://discord.com/api/v8/channels/${packet.d.channel_id}/messages/${packet.d.message_id}`
      fetch(uri, {
        method: 'DELETE',
        headers: {
          authorization: `${clientUser.bot ? 'Bot ' : ''}${client.token}`
        }
      }).catch(() => {})
    }

    if (!helpRoles) {
      ticket.status = config.ids.ticketStatuses.closed
      ticket.save()
      return
    }

    const members = guild.members.cache
      .array()
      .filter(m => helpRoles.some(id => m.roles.cache.has(id)))
      
    const captcha = Util.generateCaptcha()
    ticket.status = config.ids.ticketStatuses.pending
    ticket.captcha = captcha
    ticket.save()

    let user: User | undefined
    {
      const uri = `https://discord.com/api/v8/users/${ticket.author_id}`
      user = await fetch(uri, {
        method: 'GET',
        headers: {
          authorization: `${clientUser.bot ? 'Bot ' : ''}${client.token}`
        }
      })
        .then(res => res.json())
        .catch(() => {})
      if (user) user = new User(client, user)
      else user = undefined
    }

    const captchaImage = CanvasUtil.captcha(captcha)

    const embed: MessageEmbedOptions = {
      color: config.meta.defaultColor,
      title: '⠀⠀⠀⠀⠀⠀⠀Возьмите тикет!',
      description: `> ${ticket.text}`,
      fields: [
        {
          name: 'Пользователь',
          value: `<:user:774229456951967745><@${ticket.author_id}>`,
          inline: true
        },
        {
          name: `Отправлен с ${
            ['текстового', 'голосового'][ticket.channel_type]
          } канала`,
          value: `<#${ticket.channel_id}>`
        }
      ],
      image: { url: 'attachment://captcha.png' },
      timestamp: Date.now()
    }
    if (user) {
      embed.footer = {
        text: user.tag,
        icon_url: user.displayAvatarURL({ dynamic: true })
      }
    }
    members.forEach(m => {
      m.send({
        embed,
        files: [{ attachment: captchaImage, name: 'captcha.png' }]
      }).catch(() => {})
    })
  }
}
