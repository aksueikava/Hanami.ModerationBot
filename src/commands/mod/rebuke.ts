import { Message, MessageEmbedOptions } from 'discord.js'

import Rebuke from '../../models/rebuke'

import Command, { CommandParams } from '../../structures/Command'

import * as Util from '../../utils/util'
import * as config from '../../config'

export default class extends Command {
  get options() {
    return { name: 'выговор' }
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

    Rebuke.insertOne({
      user_id: targetMember.id,
      author_id: message.author.id,
      reason,
      tick: Date.now()
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
