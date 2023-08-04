import { MongoModel, Document, Mongo } from 'discore.js'

import db from '../utils/db'

const colName = 'tickets'

export interface ITicket extends Document {
  id: string
  moder_id: string
  author_id: string
  message_id: string
  channel_id: string
  channel_type: number

  text: string
  status: number
  captcha: string
  assessment: number

  start_tick: number
  end_tick: number
}
db.addModel(colName, {
  id: { type: Mongo.Types.String, default: undefined },
  moder_id: { type: Mongo.Types.String, default: undefined },
  author_id: { type: Mongo.Types.String, default: undefined },
  message_id: { type: Mongo.Types.String, default: undefined },
  channel_id: { type: Mongo.Types.String, default: undefined },
  channel_type: { type: Mongo.Types.Number, default: undefined },

  text: { type: Mongo.Types.String, default: undefined },
  status: { type: Mongo.Types.Number, default: 0 },
  captcha: { type: Mongo.Types.String, default: undefined },
  assessment: { type: Mongo.Types.Number, default: undefined },

  start_tick: { type: Mongo.Types.Number, default: undefined },
  end_tick: { type: Mongo.Types.Number, default: undefined },
})

const Ticket = db.getCollection(colName) as MongoModel<ITicket>

export default Ticket
