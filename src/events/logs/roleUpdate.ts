import { Event } from 'discore.js'
import {
  GuildMember,
  TextChannel,
  GuildAuditLogs,
  EmbedFieldData
} from 'discord.js'

import * as Util from '../../utils/util'
import * as config from '../../config'

export default class extends Event {
  get options() {
    return { name: 'guildMemberUpdate' }
  }

  async run(oldMember: GuildMember, newMember: GuildMember) {
    if (!Util.verifyWorkingGuild(newMember.guild.id)) return

    const logsChannel = newMember.guild.channels.cache.get(
      config.ids.channels.text.logs
    ) as TextChannel
    if (!logsChannel) return

    if (oldMember.roles.cache.size === newMember.roles.cache.size) return

    const lessRolesMember =
      oldMember.roles.cache.size < newMember.roles.cache.size
        ? oldMember
        : newMember
    const moreRolesMember =
      oldMember.roles.cache.size > newMember.roles.cache.size
        ? oldMember
        : newMember

    const updatedRole = moreRolesMember.roles.cache.find(r => {
      return !lessRolesMember.roles.cache.has(r.id)
    })
    if (!updatedRole) return

    const audit = await newMember.guild
      .fetchAuditLogs({
        type: GuildAuditLogs.Actions.MEMBER_ROLE_UPDATE
      })
      .then(logs => logs.entries.first())
      .catch(() => {})

    const change = ((audit || {}).changes || [])[0]
    const changeID = ((change.new || [])[0] || {}).id
    const executor = (audit || {}).executor
    const moderator = changeID === updatedRole.id ? executor : undefined

    const fields: EmbedFieldData[] = []
    if (moderator) {
      fields.push({
        name: 'Модератор',
        value: String(moderator),
        inline: false
      })
    }

    const embed = {
      color: config.meta.defaultColor,
      thumbnail: { url: newMember.user.displayAvatarURL({ dynamic: true }) },
      description: `${newMember}\nОбновлены роли участника\n> ${
        newMember.roles.cache.has(updatedRole.id) ? '+' : '-'
      } ${updatedRole}`,
      fields,
      footer: { text: `ID: ${newMember.id}` },
      timestamp: Date.now()
    }
    logsChannel.send({ embed }).catch(() => {})
  }
}
