import type { Env } from './env';
import { api } from './api';
import { handleEmail } from './email';
import { sendWeeklyReport } from './report';
import { cleanupAuth } from './auth';

export default {
  fetch: (request: Request, env: Env, ctx: ExecutionContext) => api.fetch(request, env, ctx),
  email: (message: ForwardableEmailMessage, env: Env, ctx: ExecutionContext) => ctx.waitUntil(handleEmail(message, env)),
  scheduled: (_event: ScheduledController, env: Env, ctx: ExecutionContext) => ctx.waitUntil(sendWeeklyReport(env).then(() => cleanupAuth(env))),
} satisfies ExportedHandler<Env>;
