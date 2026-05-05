import { EPGGrabber, GrabCallbackData, EPGGrabberMock, SiteConfig, Channel } from 'epg-grabber'
import { Logger, Collection } from '@freearhey/core'
import { Queue } from './'
import { GrabOptions } from '../commands/epg/grab'
import { TaskQueue, PromisyClass } from 'cwait'
import { Storage } from '@freearhey/core'
import path from 'path'

type GrabberProps = {
  logger: Logger
  queue: Queue
  options: GrabOptions
}

const BATCH_SIZE = 500 // Flush every 500 programs
const BATCH_CACHE_DIR = '.cache/batch'

export class Grabber {
  logger: Logger
  queue: Queue
  options: GrabOptions
  private batchCounter: number = 0
  private storage: Storage
  private channels: Collection
  private currentBatchPrograms: any[] = []

  constructor({ logger, queue, options }: GrabberProps) {
    this.logger = logger
    this.queue = queue
    this.options = options
    this.grabber = process.env.NODE_ENV === 'test' ? new EPGGrabberMock() : new EPGGrabber()
    this.storage = new Storage()
    this.channels = new Collection()
  }

  async grab(): Promise<{ channels: Collection; programs: Collection }> {
    const taskQueue = new TaskQueue(Promise as PromisyClass, this.options.maxConnections)

    const total = this.queue.size()
    let i = 1

    // Initialize batch cache directory
    await this.initializeBatchCache()

    try {
      await Promise.all(
        this.queue.items().map(
          taskQueue.wrap(
            async (queueItem: { channel: Channel; config: SiteConfig; date: string }) => {
              const { channel, config, date } = queueItem

              // Store channel (small, safe to keep in memory)
              this.channels.add(channel)

              if (this.options.timeout !== undefined) {
                const timeout = parseInt(this.options.timeout)
                config.request = { ...config.request, ...{ timeout } }
              }

              if (this.options.delay !== undefined) {
                const delay = parseInt(this.options.delay)
                config.delay = delay
              }

              const _programs = await this.grabber.grab(
                channel,
                date,
                config,
                (data: GrabCallbackData, error: Error | null) => {
                  const { programs, date } = data

                  this.logger.info(
                    `  [${i}/${total}] ${channel.site} (${channel.lang}) - ${
                      channel.xmltv_id
                    } - ${date.format('MMM D, YYYY')} (${programs.length} programs)`
                  )
                  if (i < total) i++

                  if (error) {
                    this.logger.info(`    ERR: ${error.message}`)
                  }
                }
              )

              // Process programs in batches instead of concatenating
              await this.processProgramBatch(_programs)
            }
          )
        )
      )

      // Flush any remaining programs in the current batch
      if (this.currentBatchPrograms.length > 0) {
        await this.saveBatch()
      }

      // Read all batches back and combine into a single Collection
      const programs = await this.loadAllBatches()

      return { channels: this.channels, programs }
    } finally {
      // Cleanup batch cache after successful completion
      await this.cleanupBatchCache()
    }
  }

  private async initializeBatchCache(): Promise<void> {
    try {
      // Create cache directory if it doesn't exist
      const fs = await import('fs/promises')
      await fs.mkdir(BATCH_CACHE_DIR, { recursive: true })
    } catch (error) {
      this.logger.info(`Warning: Could not create batch cache directory: ${error}`)
    }
  }

  private async processProgramBatch(programs: any[]): Promise<void> {
    this.currentBatchPrograms.push(...programs)

    if (this.currentBatchPrograms.length >= BATCH_SIZE) {
      await this.saveBatch()
    }
  }

  private async saveBatch(): Promise<void> {
    if (this.currentBatchPrograms.length === 0) return

    const batchFile = path.join(BATCH_CACHE_DIR, `batch_${this.batchCounter}.json`)
    const batchData = JSON.stringify(this.currentBatchPrograms)

    try {
      await this.storage.save(batchFile, batchData)
      this.batchCounter++
      this.currentBatchPrograms = [] // Clear current batch from memory

      // Force garbage collection hint if available
      if (global.gc) {
        global.gc()
      }
    } catch (error) {
      this.logger.info(`Warning: Could not save batch file: ${error}`)
    }
  }

  private async loadAllBatches(): Promise<Collection> {
    const programs = new Collection()

    try {
      const fs = await import('fs/promises')

      for (let i = 0; i < this.batchCounter; i++) {
        const batchFile = path.join(BATCH_CACHE_DIR, `batch_${i}.json`)

        try {
          const content = await fs.readFile(batchFile, 'utf-8')
          const batchPrograms = JSON.parse(content)
          programs.concat(new Collection(batchPrograms))

          // Force garbage collection after processing each batch
          if (global.gc) {
            global.gc()
          }
        } catch (error) {
          this.logger.info(`Warning: Could not load batch file ${i}: ${error}`)
        }
      }
    } catch (error) {
      this.logger.info(`Warning: Could not load batch files: ${error}`)
    }

    return programs
  }

  private async cleanupBatchCache(): Promise<void> {
    try {
      const fs = await import('fs/promises')
      await fs.rm(BATCH_CACHE_DIR, { recursive: true, force: true })
    } catch (error) {
      this.logger.info(`Warning: Could not cleanup batch cache: ${error}`)
    }
  }
}
