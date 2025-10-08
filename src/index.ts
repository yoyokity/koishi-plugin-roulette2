import { Context, Schema, segment, Random } from 'koishi'

export const name = 'roulette'
export const usage = `开枪后，随机概率对其禁言
如果没禁言则增加下一次禁言的时间`

export interface Config {
  probability?: number
  initTime?: number
  timeStepMin?: number
  timeStepMax?: number
}

export const Config: Schema<Config> = Schema.object({
  probability: Schema.number()
    .min(0).max(1).step(0.05)
    .default(0.2)
    .role('')
    .description('被禁言的概率，0-1'),

  initTime: Schema.number()
    .min(30).max(300).step(10)
    .default(30)
    .role('')
    .description('初始禁言时间（秒）'),

  timeStepMin: Schema.number()
    .min(0).max(120).step(5)
    .default(15)
    .role('')
    .description('每次空枪后叠加的随机最小禁言时间（秒）'),

  timeStepMax: Schema.number()
    .min(0).max(120).step(5)
    .default(120)
    .role('')
    .description('每次空枪后叠加的随机最大禁言时间（秒）')
})

class Status {
  /**
   * 禁言时间（秒）
   */
  time: number
  config: Config

  constructor(config: Config) {
    this.config = config
    this.time = config.initTime
  }

  add() {
    this.time = this.time + Random.int(this.config.timeStepMin, this.config.timeStepMax)
  }
}

let status: Status | null = null

function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds.toString().padStart(2, '0')} 秒`
  }
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes.toString().padStart(2, '0')} 分 ${remainingSeconds.toString().padStart(2, '0')} 秒`
}

export function apply(ctx: Context, config: Config) {
  ctx.intersect(session => session.guildId !== undefined)
    .command('开枪', '对自己开一枪，看看会不会死哦')
    .action(async ({ session }) => {
      //初始化
      if (status === null) {
        status = new Status(config)
      }

      if (Random.bool(config.probability)) {
        //被禁言
        await session.bot.muteGuildMember(session.guildId, session.userId, status.time * 1000)

        await session.sendQueued(`${segment.at(session.userId!)} 被杀死了！`, 500)
        await session.sendQueued('撒，让我们来开始新一轮的游戏吧。（上弹中）', 500)

        status = null
        return
      }
      else {
        //空枪
        status.add()

        return `${segment.at(session.userId!)} 这枪空了，恭喜你躲过一劫！\n禁言时间将增加到 ${formatTime(status.time)}！`
      }
    })
}
