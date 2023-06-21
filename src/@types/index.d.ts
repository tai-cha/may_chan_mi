import { entities } from "misskey-js"

export type Server = {
  origin: string
  credential: string
}

export type Note = entities.Note