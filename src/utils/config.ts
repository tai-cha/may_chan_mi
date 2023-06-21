import { Server } from '@/@types'

const envFile = process.env.NODE_ENV === 'development' ? '.env.development' : '.env'

require('dotenv').config({ path: `./${envFile}` })

export const server:Server = {
  origin: process.env?.SERVER_ORIGIN || "https://misskey.io",
  credential: process.env.SERVER_TOKEN || ''
}

export const postDisabled = process.env?.POST_DISABLED?.toUpperCase() == "TRUE" ? true : false

export default {server, postDisabled}