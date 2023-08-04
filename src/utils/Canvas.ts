import { createCanvas } from 'canvas'

class CanvasUtil {
  static captcha(text: string) {
    const canvas = createCanvas(90, 30)
    const ctx = canvas.getContext('2d')

    ctx.fillStyle = '#fff'
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.font = '18px Helvetica'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#000'
    ctx.fillText(text, canvas.width / 2, canvas.height / 2, canvas.width)

    return canvas.toBuffer()
  }
}

export default CanvasUtil
