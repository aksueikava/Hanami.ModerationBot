import { Event } from 'discore.js'
import { Role, TextChannel, GuildAuditLogs } from 'discord.js'

import * as Util from '../../utils/util'
import * as config from '../../config'

export default class extends Event {
  get options() {
    return { name: 'roleUpdate' }
  }

  async run(oldRole: Role, newRole: Role) {
    if (!newRole.guild) return
    if (!Util.verifyWorkingGuild(newRole.guild.id)) return

    const logsChannel = newRole.guild.channels.cache.get(
      config.ids.channels.text.logs
    ) as TextChannel
    if (!logsChannel) return

    if (oldRole.name === newRole.name) return

    const audit = await newRole.guild
      .fetchAuditLogs({
        type: GuildAuditLogs.Actions.ROLE_UPDATE
      })
      .then(logs => logs.entries.first())
      .catch(() => {})

    const target = (audit || {}).target as Role | undefined
    const executor = (audit || {}).executor
    const targetID = (target || {}).id
    const moderator = targetID === newRole.id ? executor : undefined

    const fields = [
      {
        name: 'Название',
        value: `« **\`${oldRole.name}\`** » ⇒ « **\`${newRole.name}\`** »`,
        inline: false
      }
    ]
    if (moderator) {
      fields.push({
        name: 'Модератор',
        value: `> ${moderator}`,
        inline: false
      })
    }

    const embed = {
      color: config.meta.defaultColor,
      description: `Роль отредактирована\n> ${newRole}`,
      fields,
      footer: { text: `ID: ${newRole.id}` },
      timestamp: Date.now()
    }
    logsChannel.send({ embed }).catch(() => {})
  }
}
