import { Mongo, MongoModel, Document } from 'discore.js'

import * as config from '../config'

const db = new Mongo(config.internal.mongoURI)

export interface IUser extends Document {}
db.addModel('users', {})
export const User = db.getCollection('users') as MongoModel<IUser>

export interface IWarn extends Document {
  userID: string
  tick: number
  endTick: number
}
db.addModel('warns', {
  userID: { type: Mongo.Types.String, default: undefined },
  tick: { type: Mongo.Types.Number, default: undefined },
  endTick: { type: Mongo.Types.Number, default: undefined }
})
export const Warn = db.getCollection('warns') as MongoModel<IWarn>

export interface IBan extends Document {
  userID: string
  endTick: number
  tick: number
}
db.addModel('bans', {
  userID: { type: Mongo.Types.String, default: undefined },
  endTick: { type: Mongo.Types.Number, default: undefined },
  tick: { type: Mongo.Types.Number, default: undefined }
})
export const Ban = db.getCollection('bans') as MongoModel<IBan>

export interface IMute extends Document {
  userID: string
  endTick: number
  tick: number
  jump: number
}
db.addModel('mutes', {
  userID: { type: Mongo.Types.String, default: undefined },
  endTick: { type: Mongo.Types.Number, default: undefined },
  tick: { type: Mongo.Types.Number, default: undefined },
  jump: { type: Mongo.Types.Number, default: undefined }
})
export const Mute = db.getCollection('mutes') as MongoModel<IMute>

export interface IChatMute extends Document {
  userID: string
  endTick: number
  tick: number
}
db.addModel('chatmutes', {
  userID: { type: Mongo.Types.String, default: undefined },
  endTick: { type: Mongo.Types.Number, default: undefined },
  tick: { type: Mongo.Types.Number, default: undefined }
})
export const ChatMute = db.getCollection('chatmutes') as MongoModel<IChatMute>

export interface IJumpMute extends Document {
  userID: string
  endTick: number
  tick: number
}
db.addModel('jumpmutes', {
  userID: { type: Mongo.Types.String, default: undefined },
  endTick: { type: Mongo.Types.Number, default: undefined },
  tick: { type: Mongo.Types.Number, default: undefined }
})
export const JumpMute = db.getCollection('jumpmutes') as MongoModel<IJumpMute>

export interface IPunishRequest extends Document {
  userID: string
  moderID: string
  messageID: string
  duration: number
  reason: string
  type: number
  tick: number
}
db.addModel('punishrequests', {
  userID: { type: Mongo.Types.String, default: undefined },
  guildID: { type: Mongo.Types.String, default: undefined },
  moderID: { type: Mongo.Types.String, default: undefined },
  messageID: { type: Mongo.Types.String, default: undefined },
  duration: { type: Mongo.Types.Number, default: undefined },
  reason: { type: Mongo.Types.String, default: undefined },
  type: { type: Mongo.Types.Number, default: undefined },
  tick: { type: Mongo.Types.Number, default: undefined }
})
export const PunishRequest = db.getCollection(
  'punishrequests'
) as MongoModel<IPunishRequest>

export interface IPunishment extends Document {
  userID: string
  moderID: string
  reason: string
  type: number
  tick: number
}
db.addModel('punishments', {
  userID: { type: Mongo.Types.String, default: undefined },
  moderID: { type: Mongo.Types.String, default: undefined },
  reason: { type: Mongo.Types.String, default: undefined },
  type: { type: Mongo.Types.Number, default: undefined },
  tick: { type: Mongo.Types.Number, default: undefined }
})
export const Punishment = db.getCollection(
  'punishments'
) as MongoModel<IPunishment>

export interface IModAction extends Document {
  executorID: string
  type: number
  tick: number
}
db.addModel('modactions', {
  executorID: { type: Mongo.Types.String, default: undefined },
  type: { type: Mongo.Types.Number, default: undefined },
  tick: { type: Mongo.Types.Number, default: undefined }
})
export const ModAction = db.getCollection(
  'modactions'
) as MongoModel<IModAction>

export default db
