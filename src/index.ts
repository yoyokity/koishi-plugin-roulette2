import { Context, Schema, segment } from 'koishi'

export const name = 'roulette'
export const usage = `开枪后，随机概率对其禁言
如果没禁言则增加下一次禁言的时间`

export interface Config {
  probability?: number
  initTime?: number
  timeStep?: number
}

export const Config: Schema<Config> = Schema.object({
  probability: Schema.number()
    .min(0).max(1).step(0.05)
    .default(0.2)
    .role('slider')
    .description('被禁言的概率，0-1'),

  initTime: Schema.number()
    .min(30).max(300).step(10)
    .default(30)
    .role('slider')
    .description('初始禁言时间（秒）'),

  timeStep: Schema.number()
    .min(0).max(120).step(5)
    .default(30)
    .role('slider')
    .description('每次空枪后叠加的禁言时间（秒）')
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
    this.time = this.time + this.config.timeStep
  }
}

let status: Status | null = null

export function apply(ctx: Context, config: Config) {
  ctx.intersect(session => session.guildId !== undefined)
    .command('开枪', '对自己开一枪，看看会不会死哦')
    .action(async ({ session }) => {
      //初始化
      if ( status === null ) {
        status = new Status(config)
      }

      if ( getRandomBoolean(config.probability) ) {
        //被禁言
        await session.bot.muteGuildMember(session.guildId, session.userId, status.time * 1000)

        session.send(`嘻嘻嘻，${segment.at(session.userId!)} 被杀死了！`)
        status = null

        return '撒，让我们来开始新一轮的游戏吧。（上弹中）'
      }
      else {
        //空枪
        status.add()

        return `${segment.at(session.userId!)} 这枪空了，恭喜你躲过一劫！\n禁言时间将增加到 ${status.time} 秒！`
      }
    })
}

/**
 * 根据给定的概率（0到1之间）返回布尔值。
 * @param probability 概率值 (0.2 表示 20% 的几率为 true)
 * @returns 达到概率时返回 true，否则返回 false
 */
function getRandomBoolean(probability: number): boolean {
  return Math.random() <= probability
}
