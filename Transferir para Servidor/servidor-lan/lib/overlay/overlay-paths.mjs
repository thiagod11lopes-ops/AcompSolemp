import { resolve } from 'node:path'
import { SERVIDOR_LAN_DIR } from '../load-servidor-env.mjs'

export const OVERLAY_DIR = resolve(SERVIDOR_LAN_DIR, 'overlay')
export const OVERLAY_STATE_PATH = resolve(OVERLAY_DIR, 'overlay-state.json')
export const WG_SERVER_KEY_PATH = resolve(OVERLAY_DIR, 'wg-server.key')
export const WG_SERVER_CONF_PATH = resolve(OVERLAY_DIR, 'wireguard', 'acomopms-server.conf')
