import { Message, MessageEmbedOptions } from 'discord.js'

import Rebuke from '../../models/rebuke'

import Command, { CommandParams } from '../../structures/Command'

import * as Util from '../../utils/util'
import * as config from '../../config'

export default class extends Command {
  get options() {
    return { name: 'снять выговор' }
  }

  async execute(
    message: Message,
    args: string[],
    { guild, member }: CommandParams
  ) {
    if (!member.permissions.has('ADMINISTRATOR')) return

    const userArg = args.shift()
    if (!userArg) {
      const embed: MessageEmbedOptions = {
        color: config.meta.defaultColor,
        description: 'Участник не найден'
      }
      return message.channel.send({ embed }).catch(() => {})
    }

    const userID = Util.resolveUserID(userArg)
    if (!userID) {
      const embed: MessageEmbedOptions = {
        color: config.meta.defaultColor,
        description: 'Участник не найден'
      }
      return message.channel.send({ embed }).catch(() => {})
    }

    const reason = args.join(' ')
    if (reason.length < 1) {
      const embed: MessageEmbedOptions = {
        color: config.meta.defaultColor,
        description: 'Укажите причину'
      }
      return message.channel.send({ embed }).catch(() => {})
    }

    const targetMember = await guild.members.fetch(userID).catch(() => {})
    if (!targetMember) {
      const embed: MessageEmbedOptions = {
        color: config.meta.defaultColor,
        description: 'Участник не найден'
      }
      return message.channel.send({ embed }).catch(() => {})
    }

    const some = (id: string) => targetMember.roles.cache.has(id)
    if (!config.meta.modRoles.some(some)) {
      const embed: MessageEmbedOptions = {
        color: config.meta.defaultColor,
        description: 'Участник не является модератором'
      }
      return message.channel.send({ embed }).catch(() => {})
    }

    const rebukes = await Rebuke.filter({ user_id: targetMember.id })
    if (rebukes.length < 1) {
      const embed: MessageEmbedOptions = {
        color: config.meta.defaultColor,
        description: 'У данного модератора отсутствуют выговоры'
      }
      return message.channel.send({ embed }).catch(() => {})
    }

    const sortedRebukes = rebukes.sort((a, b) => a.tick - b.tick)
    Rebuke.deleteOne({
      author_id: sortedRebukes[0].author_id,
      user_id: sortedRebukes[0].user_id,
      tick: sortedRebukes[0].tick
    })

    const embed: MessageEmbedOptions = {
      color: config.meta.defaultColor,
      title: '**Вы получили выговор**',
      description:
        'Не переживайте, вы сможете подать на апелляцию через **1 неделю**.'
    }
    targetMember.send({ embed }).catch(() => {})
  }
}
