import { Event } from 'discore.js'
import { VoiceState } from 'discord.js'
import { Mute } from '../utils/db'
import { ids } from '../config'

export default class extends Event {
  get options() {
    return { name: 'voiceChannelJoin' }
  }

  async run(_: VoiceState, state: VoiceState) {
    const muteDoc = await Mute.findOne({ userID: state.id })
    if (muteDoc && !muteDoc.jump) {
      muteDoc.jump++
      muteDoc.save()
    } else if (muteDoc && muteDoc.jump >= 1) {
      if (muteDoc.jump >= 10 && state.member?.roles.cache.has(ids.roles.jumpmute)) {
        state.member?.roles.add(ids.roles.jumpmute).then(async (m) => {
          setTimeout(() => {
            muteDoc.jump = 0
            muteDoc.save()
            m.roles.remove(ids.roles.jumpmute).catch(() => { })
          }, 60 * 60 * 30)
        });
      } else {
        muteDoc.jump++
        muteDoc.save()
        setTimeout(async () => {
          muteDoc.jump = 0
          muteDoc.save()
        }, 60)
      }
    }
    if (!muteDoc && state.serverMute) state.setMute(false).catch(() => {})
    else if (muteDoc && !state.serverMute) state.setMute(true).catch(() => {})
  }
}
