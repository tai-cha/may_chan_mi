import * as Config from '@/utils/config.js'
import * as Mi from 'misskey-js'

export class Misskey {
  static #client:Mi.api.APIClient | undefined = undefined
  static createApiClient():Mi.api.APIClient {
    this.#client = new Mi.api.APIClient( Config.server ) as Mi.api.APIClient
    return this.#client
  }
  static #isApiClient(client: Mi.api.APIClient | undefined): client is Exclude<typeof client, undefined> {
    return client !== undefined
  }
  static getOrCreateApiClient():Mi.api.APIClient {
    if (this.#isApiClient(this.#client)) {
      return this.#client
    } else {
      return this.createApiClient()
    }
  }
  static async postNote<O extends Mi.Endpoints['notes/create']['req']>(text: string, options?: O) {
    let _options:Mi.Endpoints['notes/create']['req'] = { visibility: "public", text: text }
    Object.assign(_options, options)
    if (Config.postDisabled) {
      console.log('post disabled')
      console.log(text)
      return
    }
    const post = await this.request('notes/create', _options)
    console.log(post)
    return post
  }

  static request = this.getOrCreateApiClient().request.bind(this.getOrCreateApiClient())

  static isUserDetailed = (user: Mi.entities.User): user is Mi.entities.UserDetailed => {
    return ('isBot' in user)
  }
}

export default { Misskey }