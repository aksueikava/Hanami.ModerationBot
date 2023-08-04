import fetch from 'node-fetch'

import { Event } from 'discore.js'
import { ClientUser, Message } from 'discord.js'

import client from '../../main'
import PunishManager from '../../managers/PunishManager'

import * as Util from '../../utils/util'

interface APIInviteResponse {
  code?: string
  guild?: {
    id: string
    name: string
  }
}

const inviteRegex = /(?:discord(?:app)?\.com\/invite|discord\.gg)\/(\S+)/i

function getInvite(code: string): Promise<APIInviteResponse | void> {
  return fetch(`https://discord.com/api/v7/invites/${code}`)
    .then(res => res.json())
    .catch(() => {})
}

export default class extends Event {
  get options() {
    return { name: 'message' }
  }

  async run(message: Message) {
    if (!message.guild) return
    if (!Util.verifyWorkingGuild(message.guild.id)) return

    const globalRegex = new RegExp(inviteRegex.source, `g${inviteRegex.flags}`)

    const globalMatch = message.content.match(globalRegex)
    if (!globalMatch) return

    const inviteCodes = globalMatch
      .map(e => e.match(inviteRegex))
      .filter(Boolean)
      .map(m => (m as RegExpMatchArray)[1])

    for (const code of inviteCodes) {
      const invite = await getInvite(code)
      if (invite && invite.guild) {
        if (!Util.verifyWorkingGuild(invite.guild.id)) {
          message.delete().catch(() => {})
          const clientUser = client.user as ClientUser
          return PunishManager.ban({
            userID: message.author.id,
            guildID: message.guild.id,
            moderID: clientUser.id,
            reason: 'Рассылка приглашений на посторонние сервера'
          })
        }
      }
    }
  }
}
