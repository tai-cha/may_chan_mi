import { Note } from "@/@types"
import { createTextFromInputs } from '@/utils/text_maker'
import { Misskey } from '@/utils/misskey'
import retry from 'async-retry'
import { isStringArray } from '@/utils/type_checker';

const raiseOmittedTimeline = (notes:Note[]) => {
  // misskey.ioでノートが取得できない場合にエラー扱いしてリトライするためにエラーを起こす
  if (notes.filter(note => note.userId === '7rkr4nmz19' && note.text?.includes('読み込み時のタイムライン表示を簡略化')).length >= 2) {
    console.debug('高負荷のためTL取得不可')
    throw new Error('omitted timeline')
  }
}

const getLastNote = (notes:Array<Note>) => notes.slice(-1)[0];

const getNotes = async ():Promise<Array<Note>> => {
  const options = {
    excludeNsfw: false,
    limit: 100
  }
  console.log('loading notes...')
  let notes = await retry(
    async ()=> {
      const req = await Misskey.request('notes/hybrid-timeline', options)

      raiseOmittedTimeline(req)
      
      return req
    },
    { retries: 10, onRetry: ()=> { console.log("retrying...") } }
  )
  if (notes.length === 0) return []

  while (notes.length > 300) {
    const newNotes = await retry(async ()=> {
        console.log(`Getting notes: {sinceId: ${getLastNote(notes).id}}`)
        const req = await Misskey.request('notes/hybrid-timeline', {
          sinceId: getLastNote(notes).id,
          ...options
        })

        raiseOmittedTimeline(req)

        return req
      }, {
        retries: 10,
        minTimeout: 5000,
        onRetry: (err, num)=> {
          console.log(`get note retrying...${num}`)
          console.debug(err)
        }
      }
    )
    notes = notes.concat(newNotes)
    console.log(notes.length)
    await new Promise((resolve) => setTimeout(resolve, 700))
  }

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
    await retry(async() => {
      return await Misskey.postNote(text || '')
    }, {
      retries: 15,
      minTimeout: 5000,
      onRetry: (err, num)=> {
        console.log(`Retrying: note posting...${num}`)
        console.debug(err)
      }
    }).then(async n => {
      console.log('投稿完了')
    }).catch(err => {
      console.log("ノート投稿の失敗が既定の回数を超えました")
      console.log(err)
    })
  }
})()