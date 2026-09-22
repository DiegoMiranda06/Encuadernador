import { deleteJob, listJobs } from './jobs'

const DEFAULT_TTL_HOURS = 24

function ttlHours(): number {
  const raw = import.meta.env.VITE_JOB_TTL_HOURS
  const parsed = raw ? Number(raw) : NaN
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TTL_HOURS
}

/** Barrido TTL al arrancar la app — borra de verdad los trabajos vencidos de IndexedDB. */
export async function runCleanup(now = Date.now()): Promise<number> {
  const ttlMs = ttlHours() * 60 * 60 * 1000
  const expired = (await listJobs()).filter((job) => now - job.createdAt > ttlMs)
  await Promise.all(expired.map((job) => deleteJob(job.jobId)))
  return expired.length
}
