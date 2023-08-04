import { MessageEmbedOptions } from "discord.js"

export type nil = null | undefined

export type NilPartial<T> = { [K in keyof T]: T[K] | nil }

export type CustomEmbedData = MessageEmbedOptions & {
  content?: string
  text?: string
  plainText?: string
}

export interface ParsedTime {
  w: number
  d: number
  h: number
  m: number
  s: number
}
