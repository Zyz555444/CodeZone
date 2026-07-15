/**
 * CodeZone API Server
 */

import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import authRoutes from './routes/auth.js'
import repoRoutes from './routes/repos.js'
import issueRoutes from './routes/issues.js'
import pullRoutes from './routes/pulls.js'
import discussionRoutes from './routes/discussions.js'
import pipelineRoutes from './routes/pipelines.js'
import teamRoutes from './routes/team.js'
import dashboardRoutes from './routes/dashboard.js'
import milestoneRoutes from './routes/milestones.js'

// load env
dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

/**
 * API Routes
 */
app.use('/api/auth', authRoutes)
app.use('/api/repos', repoRoutes)
app.use('/api/repos/:repoId/issues', issueRoutes)
app.use('/api/repos/:repoId/pulls', pullRoutes)
app.use('/api/repos/:repoId/discussions', discussionRoutes)
app.use('/api/pipelines', pipelineRoutes)
app.use('/api/team', teamRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/milestones', milestoneRoutes)

/**
 * health
 */
app.use('/api/health', (_req: Request, res: Response): void => {
  res.status(200).json({ success: true, message: 'ok' })
})

/**
 * error handler middleware
 */
app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(error)
  res.status(500).json({ success: false, error: 'Server internal error' })
})

/**
 * 404 handler
 */
app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'API not found' })
})

export default app
