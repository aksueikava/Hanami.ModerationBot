import { MongoModel, Document, Mongo } from 'discore.js'

import db from '../utils/db'

const colName = 'moderators'

export interface IModerator extends Document {
  user_id: string
  staff_since: number

  rank: number
  score: number
  mute_count: number
  voice_time: number

  day_voice_time: number
}
db.addModel(colName, {
  user_id: { type: Mongo.Types.String, default: undefined },
  staff_since: { type: Mongo.Types.Number, default: 0 },

  rank: { type: Mongo.Types.Number, default: 0 },
  score: { type: Mongo.Types.Number, default: 0 },
  mute_count: { type: Mongo.Types.Number, default: 0 },
  voice_time: { type: Mongo.Types.Number, default: 0 },

  day_voice_time: { type: Mongo.Types.Number, default: 0 }
})

const Moderator = db.getCollection(colName) as MongoModel<IModerator>

export default Moderator
