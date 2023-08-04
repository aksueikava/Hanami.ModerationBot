import { MongoModel, Document, Mongo } from 'discore.js'

import db from '../utils/db'

const colName = 'rebukes'

export interface IRebuke extends Document {
  user_id: string
  author_id: string

  reason: string
  tick: number
}
db.addModel(colName, {
  user_id: { type: Mongo.Types.String, default: undefined },
  author_id: { type: Mongo.Types.String, default: undefined },

  reason: { type: Mongo.Types.String, default: undefined },
  tick: { type: Mongo.Types.Number, default: undefined }
})

const Rebuke = db.getCollection(colName) as MongoModel<IRebuke>
export default Rebuke
