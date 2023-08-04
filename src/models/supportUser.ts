import { MongoModel, Document, Mongo } from 'discore.js'

import db from '../utils/db'

const colName = 'support_users'

export interface ISupportUser extends Document {
  user_id: string
  support_access: boolean
}
db.addModel(colName, {
  user_id: { type: Mongo.Types.String, default: undefined },
  support_access: { type: Mongo.Types.Boolean, default: true }
})

const SupportUser = db.getCollection(colName) as MongoModel<ISupportUser>
export default SupportUser
