import { Event } from 'discore.js'

import PunishManager from '../managers/PunishManager'

export default class extends Event {
  get options() {
    return { name: 'raw' }
  }

  run(packet: { [key: string]: any }) {
    if (!(packet || {}).d) return
    if (packet.t !== 'MESSAGE_REACTION_ADD') return
    PunishManager.handlePacket(packet.d)
  }
}
