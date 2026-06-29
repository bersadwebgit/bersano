import { promises as fs } from 'fs'
import path from 'path'
import { executeImport } from './import-worker'
import { openRouterFetch, parseOpenRouterJsonResponse } from './openrouter-fetch'

export interface Job {
  id: string
  shopId: string
  type: 'import' | 'export' | 'ai'
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number // 0 to 100
  data: any // Input data
  result?: any // Output result
  error?: string // Error message
  createdAt: string
  updatedAt: string
}

type JobExecutor = (job: Job, updateProgress: (progress: number) => Promise<void>) => Promise<any>

const QUEUE_FILE_PATH = path.join(process.cwd(), 'jobs-queue.json')

class QueueManager {
  private jobs: Job[] = []
  private executors: Record<string, JobExecutor> = {}
  private isProcessing = false
  private initialized = false

  constructor() {
    this.registerExecutor('import', executeImport)
    this.registerExecutor('ai', async (job, updateProgress) => {
      const { prompt, systemPrompt, model, temperature } = job.data
      await updateProgress(10)

      const apiKey = process.env.OPENROUTER_API_KEY
      const apiUrl = 'https://openrouter.ai/api/v1/chat/completions'

      const apiHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'SaaS Shop Builder Manager Agent',
      }

      await updateProgress(30)

      const response = await openRouterFetch(apiUrl, {
        method: 'POST',
        headers: apiHeaders,
        body: JSON.stringify({
          model: model || 'google/gemini-2.5-flash',
          temperature: temperature ?? 0.1,
          messages: [
            ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
            { role: 'user', content: prompt }
          ]
        })
      })

      await updateProgress(70)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`OpenRouter API error (status ${response.status}): ${errorText}`)
      }

      const json = await parseOpenRouterJsonResponse(response)
      await updateProgress(100)
      return json
    })
  }

  registerExecutor(type: string, executor: JobExecutor) {
    this.executors[type] = executor
  }

  private async initialize() {
    if (this.initialized) return
    try {
      const data = await fs.readFile(QUEUE_FILE_PATH, 'utf-8')
      this.jobs = JSON.parse(data)
      // Reset any stuck "processing" jobs to "pending" or "failed" on startup/reboot
      let changed = false
      for (const job of this.jobs) {
        if (job.status === 'processing') {
          job.status = 'pending'
          job.progress = 0
          changed = true
        }
      }
      if (changed) {
        await this.saveQueue()
      }
    } catch {
      this.jobs = []
    }
    this.initialized = true
  }

  private async saveQueue() {
    try {
      await fs.writeFile(QUEUE_FILE_PATH, JSON.stringify(this.jobs, null, 2), 'utf-8')
    } catch (err) {
      console.error('Failed to write jobs queue file:', err)
    }
  }

  async addJob(shopId: string, type: 'import' | 'export' | 'ai', data: any): Promise<Job> {
    await this.initialize()

    const newJob: Job = {
      id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      shopId,
      type,
      status: 'pending',
      progress: 0,
      data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    this.jobs.unshift(newJob) // Add to beginning of list
    await this.saveQueue()

    // Trigger processing (fire and forget)
    this.triggerWorker()

    return newJob
  }

  async getJob(id: string): Promise<Job | null> {
    await this.initialize()
    return this.jobs.find(j => j.id === id) || null
  }

  async getJobs(shopId: string): Promise<Job[]> {
    await this.initialize()
    return this.jobs.filter(j => j.shopId === shopId)
  }

  async updateJob(id: string, updates: Partial<Pick<Job, 'status' | 'progress' | 'result' | 'error'>>): Promise<Job | null> {
    await this.initialize()
    const job = this.jobs.find(j => j.id === id)
    if (!job) return null

    Object.assign(job, {
      ...updates,
      updatedAt: new Date().toISOString()
    })

    await this.saveQueue()
    return job
  }

  private triggerWorker() {
    if (this.isProcessing) return
    this.isProcessing = true
    
    // Run worker in background (non-blocking)
    this.processNextJob().catch(err => {
      console.error('Queue worker main loop error:', err)
    }).finally(() => {
      this.isProcessing = false
    })
  }

  private async processNextJob() {
    await this.initialize()

    // Find first pending job
    // We reverse or search from back to process in order of creation (FIFO)
    const nextJob = [...this.jobs].reverse().find(j => j.status === 'pending')
    if (!nextJob) {
      this.isProcessing = false
      return
    }

    console.log(`[Queue Worker] Processing job ${nextJob.id} of type ${nextJob.type}`)
    
    // Update status to processing
    await this.updateJob(nextJob.id, { status: 'processing', progress: 0 })

    const executor = this.executors[nextJob.type]
    if (!executor) {
      console.error(`[Queue Worker] No executor registered for job type: ${nextJob.type}`)
      await this.updateJob(nextJob.id, {
        status: 'failed',
        error: `No executor registered for type: ${nextJob.type}`
      })
      // Process next job
      setTimeout(() => this.processNextJob(), 50)
      return
    }

    try {
      const result = await executor(nextJob, async (progress: number) => {
        // Safe update progress callback
        await this.updateJob(nextJob.id, { progress: Math.min(100, Math.max(0, Math.round(progress))) })
      })

      await this.updateJob(nextJob.id, {
        status: 'completed',
        progress: 100,
        result
      })
      console.log(`[Queue Worker] Job ${nextJob.id} completed successfully`)
    } catch (error: any) {
      console.error(`[Queue Worker] Job ${nextJob.id} failed:`, error)
      await this.updateJob(nextJob.id, {
        status: 'failed',
        error: error instanceof Error ? error.message : String(error)
      })
    }

    // Process next job after a short delay to yield CPU
    setTimeout(() => this.processNextJob(), 100)
  }
}

// Global Singleton Queue Manager
export const queueManager = new QueueManager()
export default queueManager
