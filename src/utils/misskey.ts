import * as Mi from 'misskey-js'
import * as Config from '@/utils/config'

export class Misskey {
  static #client:Mi.api.APIClient | undefined = undefined
  static createApiClient():Mi.api.APIClient {
    this.#client = new Mi.api.APIClient(Config.server)
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
  static request = async <E extends keyof Mi.Endpoints, P extends Mi.Endpoints[E]['req']>(endpoint: E, params:P) => {
    return await this.getOrCreateApiClient().request(endpoint, params)
  }

  static isUserDetailed = (user: Mi.entities.User): user is Mi.entities.UserDetailed => {
    return ('isBot' in user)
  }
}

export default { Misskey }