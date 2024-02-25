import type { Server } from '@/@types/index.js'
import { config as dotEnvConfig } from 'dotenv'

const envFile = process.env.NODE_ENV === 'development' ? '.env.development' : '.env'

dotEnvConfig({ path: `./${envFile}` })

export const server:Server = {
  origin: process.env?.SERVER_ORIGIN || "https://misskey.io",
  credential: process.env.SERVER_TOKEN || '',
}

export const postDisabled = process.env?.POST_DISABLED?.toUpperCase() == "TRUE" ? true : false

export const mecabDicDir = process.env?.MECAB_DIC_DIR

export default {server, postDisabled, mecabDicDir}