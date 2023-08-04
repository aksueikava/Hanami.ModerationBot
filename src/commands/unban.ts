import { Message } from 'discord.js'

import PunishManager from '../managers/PunishManager'

import * as Util from '../utils/util'
import * as config from '../config'

import { ModAction } from '../utils/db'
import { default as Command, CommandParams } from '../structures/Command'

export default class UnbanCommand extends Command {
  get cOptions() {
    return { suppressArgs: true, allowedRoles: config.access.commands.unban }
  }

  async execute(
    message: Message,
    args: string[],
    { guild, member }: CommandParams
  ) {
    const sendError = (content: string) => {
      const embed = { color: config.meta.defaultColor, description: content }
      message.channel
        .send({ embed })
        .then(msg => msg.delete({ timeout: config.ticks.errMsgDeletion }))
        .catch(() => {})
    }

    if (!config.meta.modRoles.some(id => member.roles.cache.has(id))) {
      const limits = {
        [config.ids.roles.immortalSponsor]: {
          time: 6.048e8,
          count: 1
        },
        [config.ids.roles.legendarySponsor]: {
          time: 1.296e9,
          count: 1
        }
      }

      const limit = (Object.entries(limits).find(l => {
        return member.roles.cache.has(l[0])
      }) || [])[1]
      if (limit) {
        const actionType = config.modActionTypes.MEMBER_UNBAN
        const actions = await ModAction.filter(a => {
          return (
            a.executorID === message.author.id &&
            a.type === actionType &&
            (a.tick as number) <= Date.now() - limit.time
          )
        })
        if (actions.length + 1 > limit.count) return

        ModAction.insertOne({
          executorID: message.author.id,
          type: actionType,
          tick: Date.now()
        })
      }
    }

    const targetID = Util.resolveUserID(args.shift() || '')
    if (!targetID) {
      sendError('Участник не найден')
      return
    }
    if (targetID === message.author.id) {
      sendError('Нельзя снять наказание себе')
      return
    }

    const reason = args.join(' ')
    if (reason.length < 1) {
      sendError('Укажите причину')
      return
    }

    const ban = await guild.fetchBan(targetID).catch(() => {})
    if (!ban) {
      sendError('Участник не забанен')
      return
    }

    PunishManager.request({
      message: {
        embed: {
          color: config.meta.defaultColor,
          title: `Снятие Ban | ${message.author.tag}`,
          description: `**Причина**\n> ${reason}`,
          fields: [
            { name: 'Пользователь', value: `<@!${targetID}>`, inline: true }
          ]
        }
      },
      userID: targetID,
      guildID: guild.id,
      moderID: message.author.id,
      reason,
      type: config.ids.punishments.unban
    })
  }
}
