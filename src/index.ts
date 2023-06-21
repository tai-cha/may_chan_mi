import { Note } from "@/@types"
import { createTextFromInputs } from '@/utils/text_maker'
import { Misskey } from '@/utils/misskey'
import retry from 'async-retry'
import { isStringArray } from '@/utils/type_checker';

const getNotes = async ():Promise<Array<Note>> => {
  const options = {
    excludeNsfw: false,
    limit: 100
  }
  console.log('loading notes...')
  let notes = await retry(
    async ()=> await Misskey.request('notes/hybrid-timeline', options),
    { retries: 5, onRetry: ()=> { console.log("retrying...") } }
  )
  if (notes.length === 0) return []
  return notes
}

async function create():Promise<string | null> {
  const notes = await getNotes();
  let texts = notes.filter(note => note.text !== null && note.cw == null).map(note => note.text)
  if (isStringArray(texts)) {
    return createTextFromInputs(texts)
  } else {
    return null
  }
}

(async ()=>{
  let text = await create()
  if (text !== null) {
    Misskey.postNote(text, {visibility: "followers"})
  }
})()