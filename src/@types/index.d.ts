import { entities } from "misskey-js"

export type Server = {
  origin: string,
  credential: string,
  fetch?: (info: RequestInfo, init?: RequestInit) => Promise<Response>
}

export type Note = entities.Note