import { loadServidorEnv } from './load-servidor-env.mjs'
import { buildHttpAllowRulePlanFromEnv } from './firewall-lan-plan.mjs'

const cfg = loadServidorEnv()
const plan = buildHttpAllowRulePlanFromEnv(cfg.envVars, cfg.httpPort)
console.log(JSON.stringify(plan))
