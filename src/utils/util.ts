import fetch, { RequestInfo, RequestInit } from 'node-fetch'

import { CronJob } from 'cron'
import {
  User as DiscordUser,
  Role,
  Guild,
  Message,
  Channel,
  ClientUser,
  GuildMember,
  MessageAttachment
} from 'discord.js'

import client, { voiceMembers } from '../main'
import PunishManager from '../managers/PunishManager'

import * as config from '../config'

import Moderator, { IModerator } from '../models/moderator'

import { ParsedTime } from './types'

export function verifyGuild(id: string) {
  return config.meta.allowedGuilds.includes(id)
}

export function verifyWorkingGuild(id: string) {
  return config.ids.guilds.main === id
}

export function resolveMentionUserID(mention: string = '') {
  const regex = /^<@!?(\d+)>$/
  const match = mention.match(regex)
  if (!match) return null
  return match[1]
}

export function resolveUserID(mention: string): string | null {
  if (/^\d+$/.test(mention)) return mention
  return resolveMentionUserID(mention)
}

export function resolveMember(
  mention: string,
  guild: Guild | undefined = client.guild
): Promise<GuildMember | null> {
  return new Promise(resolve => {
    if (!guild) return resolve(null)
    if (!mention) return resolve(null)

    const targetID = resolveUserID(mention) || mention
    if (!targetID) return resolve(null)

    resolve(guild.members.fetch(targetID).catch(() => null))
  })
}

export function getNounPluralForm(a: number) {
  if (a % 10 === 1 && a % 100 !== 11) {
    return 0
  } else if (a % 10 >= 2 && a % 10 <= 4 && (a % 100 < 10 || a % 100 >= 20)) {
    return 1
  }
  return 2
}

export function pluralNoun(num: number, ...forms: string[]) {
  if (forms.length === 1) throw new Error('Not enough forms')
  if (forms.length === 2) return num > 1 ? forms[1] : forms[0]
  return forms[getNounPluralForm(num)]
}

export function parseTime(
  time: number,
  limit: keyof ParsedTime = 'd'
): ParsedTime {
  const parsed: Partial<ParsedTime> = {}
  parsed.w = ['d', 'h', 'm', 's'].includes(limit)
    ? 0
    : Math.floor(time / 6.048e8)
  parsed.d = ['h', 'm', 's'].includes(limit) ? 0 : Math.floor(time / 8.64e7)
  parsed.h = ['m', 's'].includes(limit) ? 0 : Math.floor(time / 3.6e6)
  parsed.m = ['s'].includes(limit) ? 0 : Math.floor(time / 6e4)
  parsed.s = Math.ceil(time / 1e3)

  if (parsed.w > 0) {
    parsed.d %= 7
    parsed.h %= 24
    parsed.m %= 60
    parsed.s %= 60
  } else if (parsed.d > 0) {
    parsed.h %= 24
    parsed.m %= 60
    parsed.s %= 60
  } else if (parsed.h > 0) {
    parsed.m %= 60
    parsed.s %= 60
  } else if (parsed.m > 0) {
    parsed.s %= 60
  }

  return parsed as ParsedTime
}

export function parseFullTimeArray(
  time: number,
  {
    nouns = config.meta.timeSpelling,
    limit = 'd'
  }: {
    nouns?: { [key in keyof ParsedTime]: string | string[] }
    limit?: keyof ParsedTime
  } = {}
) {
  const parsed = parseTime(time, limit)
  return Object.entries(parsed).map(([k, v]) => {
    const noun = nouns[k as keyof ParsedTime]
    return `${(v || 0).toLocaleString('ru-RU')}${
      Array.isArray(noun) ? pluralNoun(v || 0, ...noun) : noun
    }`
  })
}

export function parseTimeArray(
  time: number,
  {
    nouns = config.meta.timeSpelling,
    limit = 'd'
  }: {
    nouns?: { [key in keyof ParsedTime]: string | string[] }
    limit?: keyof ParsedTime
  } = {}
) {
  const parsed: Partial<ParsedTime> = parseTime(time, limit)

  if (['d', 'h', 'm', 's'].includes(limit)) delete parsed.w
  if (['h', 'm', 's'].includes(limit)) delete parsed.d
  if (['m', 's'].includes(limit)) delete parsed.h
  if (['s'].includes(limit)) delete parsed.m

  return Object.entries(parsed).map(([k, v]) => {
    const noun = nouns[k as keyof ParsedTime]
    return `${(v || 0).toLocaleString('ru-RU')}${
      Array.isArray(noun) ? pluralNoun(v || 0, ...noun) : noun
    }`
  })
}

export function parseFilteredTimeArray(
  time: number,
  {
    nouns = config.meta.timeSpelling,
    limit = 'd'
  }: {
    nouns?: { [key in keyof ParsedTime]: string | string[] }
    limit?: keyof ParsedTime
  } = {}
) {
  const parsed = parseTime(time, limit)

  const filteredEntries = Object.entries(parsed).filter(([_, v]) => {
    return (v || 0) > 0
  })
  if (filteredEntries.length < 1) filteredEntries.push(['s', 0])

  return filteredEntries.map(([k, v]) => {
    const noun = nouns[k as keyof ParsedTime]
    return `${(v || 0).toLocaleString('ru-RU')}${
      Array.isArray(noun) ? pluralNoun(v || 0, ...noun) : noun
    }`
  })
}

export function discordRetryHandler(
  input: RequestInfo,
  init?: RequestInit | undefined
): Promise<void> {
  return new Promise((resolve, reject) => {
    fetch(input, init)
      .then(res => {
        if (res.headers.get('content-type') === 'application/json') {
          return res.json()
        } else {
          return { retry_after: undefined }
        }
      })
      .then(res => {
        if (typeof res.retry_after === 'number') {
          setTimeout(
            () => resolve(discordRetryHandler(input, init)),
            res.retry_after
          )
        } else {
          resolve(res)
        }
      })
      .catch(reject)
  })
}

export function react(message: Message, emojiID: string): Promise<void> {
  const emoji = client.emojis.cache.get(emojiID) || emojiID
  const clientUser = client.user as ClientUser
  return discordRetryHandler(
    `https://discord.com/api/v7/channels/${message.channel.id}/messages/${
      message.id
    }/reactions/${encodeURIComponent(
      typeof emoji === 'string' ? emoji : `${emoji.name}:${emoji.id}`
    )}/@me`,
    {
      method: 'PUT',
      headers: {
        Authorization: `${clientUser.bot ? 'Bot ' : ''}${client.token}`
      }
    }
  )
}

export function resolveEmoji(emojiID: string) {
  return `${client.emojis.cache.get(emojiID) || ''} `.trimLeft()
}

export function checkTemps() {
  PunishManager.check(config.ticks.checkInterval)

  setTimeout(() => checkTemps(), config.ticks.checkInterval)
}

export function resolveMentionRoleID(mention: string = '') {
  const regex = /^<@&?(\d+)>$/
  const match = mention.match(regex)
  if (!match) return null
  return match[1]
}

export function resolveRoleID(mention: string): string | null {
  if (/^\d+$/.test(mention)) return mention
  return resolveMentionRoleID(mention)
}

export function resolveRole(
  mention: string,
  guild: Guild | undefined = client.guild
): Role | null {
  if (!guild) return null
  if (!mention) return null

  const roleID = resolveRoleID(mention) || mention
  if (!roleID) return null

  return guild.roles.cache.get(roleID) || null
}

export function resolveMentionChannelID(mention: string = '') {
  const regex = /^<@#?(\d+)>$/
  const match = mention.match(regex)
  if (!match) return null
  return match[1]
}

export function resolveChannelID(mention: string): string | null {
  if (/^\d+$/.test(mention)) return mention
  return resolveMentionChannelID(mention)
}

export function resolveChannel(
  mention: string,
  guild: Guild | undefined = client.guild
): Channel | null {
  if (!guild) return null
  if (!mention) return null

  const channelID = resolveChannelID(mention) || mention
  if (!channelID) return null

  return guild.channels.cache.get(channelID) || null
}

export function splitArray<T>(arr: T[], limit: number): T[][] {
  const arrCopy = [...arr]
  const newArr: T[][] = []
  for (let i = 0; i < Math.ceil(arr.length / limit); i++) {
    newArr.push(arrCopy.splice(0, limit))
  }
  return newArr
}

export function getEmbedCode(attachment?: MessageAttachment) {
  if (!attachment) return null
  if (!attachment.attachment) return null

  const url = (attachment.attachment || { toString() {} }).toString() || ''
  const regex = /^https:\/\/cdn\.discordapp\.com\/attachments\/\d+\/\d+\/.+\.txt/

  if (!regex.test(url)) return null

  return fetch(url).then(res => res.text())
}

export function splitMessage(
  text: string,
  { maxLength = 2000, char = '\n', prepend = '', append = '' } = {}
) {
  if (Array.isArray(text)) text = text.join('\n')
  if (text.length <= maxLength) return [text]
  const splitText = text.split(char)
  if (splitText.some(chunk => chunk.length > maxLength)) {
    throw new RangeError('SPLIT_MAX_LEN')
  }
  const messages = []
  let msg = ''
  for (const chunk of splitText) {
    if (msg && (msg + char + chunk + append).length > maxLength) {
      messages.push(msg + append)
      msg = prepend
    }
    msg += (msg && msg !== prepend ? char : '') + chunk
  }
  return messages.concat(msg).filter(m => m)
}

export function getReaction(
  message: Message,
  emojis: string | string[],
  users: DiscordUser | DiscordUser[],
  time: number = 7.2e6
) {
  if (!Array.isArray(users)) users = [users]
  if (!Array.isArray(emojis)) emojis = [emojis]
  ;(async () => {
    try {
      for (const emoji of emojis) await react(message, emoji)
    } catch (_) {}
  })()

  return getReactionStatic(message, emojis, users, time)
}

export function getReactionStatic(
  message: Message,
  emojis: string | string[],
  users: DiscordUser | DiscordUser[],
  time: number = 7.2e6
) {
  if (!Array.isArray(users)) users = [users]
  if (!Array.isArray(emojis)) emojis = [emojis]

  return message
    .awaitReactions(
      (r, u) => {
        if (!emojis.includes(r.emoji.id || r.emoji.name)) return false
        const ids = (users as DiscordUser[]).map(u => u.id)
        if (!ids.includes(u.id)) return false
        return true
      },
      { max: 1, time, errors: ['time'] }
    )
    .then(collected => collected.first())
    .then(r => {
      if (!r) return null
      return r
    })
    .catch(() => {
      message.reactions.removeAll().catch(() => {})
      return null
    })
}

export function msConvert(time: string = ''): number | null {
  const multipliers = {
    w: 6.048e8,
    н: 6.048e8,
    d: 8.64e7,
    д: 8.64e7,
    h: 3.6e6,
    ч: 3.6e6,
    m: 6e4,
    м: 6e4,
    s: 1e3,
    с: 1e3
  }
  const regex = new RegExp(
    `^(\\d+)(${Object.keys(multipliers).join('|')})$`,
    'i'
  )

  const match = time.match(regex)
  if (!match) return null

  return (
    parseInt(match[1], 10) * multipliers[match[2] as keyof typeof multipliers]
  )
}

export function generateCaptcha() {
  let symbols = 'abcdefghijklmnopqrstufwxyz'
  symbols += symbols.toUpperCase()
  symbols += '0123456789'

  let captcha = ''
  for (let i = 0; i < 5; i++) {
    captcha += symbols[Math.floor(Math.random() * symbols.length)]
  }
  return captcha
}

export function checkModerators() {
  const daily = async () => {
    const now = Date.now()
    await [...voiceMembers.entries()].map(async e => {
      voiceMembers.set(e[0], now)
      const msTime = now - e[1]
      const time = Math.floor(msTime / 1e3)
      const mod = await Moderator.getOne({ user_id: e[0] })
      mod.day_voice_time = time + (mod.day_voice_time || 0)
      mod.voice_time = time + (mod.voice_time || 0)
      return await mod.save()
    })

    const helpers = client.guild.members.cache
      .array()
      .filter(m => m.roles.cache.has(config.ids.roles.phoenix))
      .map(m => ({
        member: m,
        next: config.ids.roles.ghost,
        current: config.ids.roles.phoenix
      }))

    const moderators = client.guild.members.cache
      .array()
      .filter(m => m.roles.cache.has(config.ids.roles.ghost))
      .map(m => ({
        member: m,
        next: config.ids.roles.astral,
        current: config.ids.roles.ghost
      }))

    const promises: Promise<{ member: GuildMember; doc: IModerator }>[] = []
    ;[...helpers, ...moderators].forEach(e => {
      const promise = Moderator.getOne({ user_id: e.member.id }).then(doc => ({
        member: e.member,
        next: e.next,
        doc
      }))
      promises.push(promise)
    })

    await Promise.all(promises).then(res => {
      res.forEach(e => {
        const minTime = 7.2e3
        const difference = e.doc.day_voice_time - minTime
        let dayScore = difference / 2400

        if (difference === -minTime) dayScore = -3

        dayScore = Math.min(5, dayScore)

        Moderator.getOne({ user_id: e.doc.user_id }).then(doc => {
          doc.score = (doc.score || 0) + dayScore
          doc.day_voice_time = 0
          doc.save()
        })
        // const newData: Partial<IModerator> = {
        //   score: (e.doc.score || 0) + dayScore
        // }
        // Moderator.updateOne({ user_id: e.doc.user_id }, newData)
      })
    })

    // Moderator.updateMany({}, { day_voice_time: 0 })
  }
  const weekly = () => {
    // const applicants: string[] = []

    // applicants.forEach(id => {
    //   discordRetryHandler(
    //     `https://discord.com/api/v8/guilds/${client.guild.id}/members/${id}/roles/${config.ids.roles.phoenix}`,
    //     { method: 'DELETE' }
    //   ).catch(() => {})
    //   discordRetryHandler(
    //     `https://discord.com/api/v8/guilds/${client.guild.id}/members/${id}/roles/${config.ids.roles.ghost}`,
    //     { method: 'PUT' }
    //   ).catch(() => {})
    // })

    const newData: Partial<IModerator> = {
      score: 0,
      mute_count: 0,
      voice_time: 0,
      staff_since: 0
    }
    Moderator.updateMany({}, newData)
  }

  new CronJob('0 0 0 * * *', daily, null, true, config.meta.defaultTimezone)
  new CronJob('0 0 0 * * 1', weekly, null, true, config.meta.defaultTimezone)
}

export function uprankModerator(member: GuildMember) {
  const some = (id: string) => member.roles.cache.has(id)
  if (!config.meta.modRoles.some(some)) return

  return Moderator.getOne({ user_id: member.id }).then(mod => {
    mod.rank += 1
    mod.save()
  })
}

export function derankModerator(member: GuildMember) {
  const some = (id: string) => member.roles.cache.has(id)
  if (!config.meta.modRoles.some(some)) return

  return Moderator.getOne({ user_id: member.id }).then(mod => {
    mod.rank -= 1
    mod.save()
  })
}
