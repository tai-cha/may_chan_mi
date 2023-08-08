import * as mfm from 'mfm-js'
import { isMfmBlock } from 'mfm-js/built/node';
import { wakatiSync } from "@enjoyjs/node-mecab"
import { isStringArray } from '@/utils/type_checker';
import Config from '@/utils/config'

// load env
Config

const CHUNK_SIZE = 3
const MAX_MATCH_LENGTH = 2
const emojiRegex = /:[0-9A-z_\-]+:/
const endLetters = ["\n", "。", "　"]

const match_length = ():number => {
  const n = 5
  const m = 13
  const min = 1
  //なんかいい感じの重み付きランダムみたいなあれを作る
  //sample: https://www.geogebra.org/graphing/kne365xj
  return Math.floor((MAX_MATCH_LENGTH - min) * Math.round(n * 2 * (Math.atan(m * Math.random())) / Math.PI) / n) + min
}

function sanitizeLoop<T extends mfm.MfmNode['type'], N extends mfm.NodeType<T>>(node: N):Array<N> {
  const inlineTypes: mfm.MfmNode['type'][] = ['unicodeEmoji', 'emojiCode', 'bold', 'small', 'italic', 'strike', 'inlineCode', 'mathInline', 'mention', 'hashtag', 'url', 'link', 'fn', 'plain', 'text']
  function isMfmInline(n: mfm.MfmNode): n is mfm.MfmInline {
    return inlineTypes.includes(n.type)
  }
  function isMfmNode(n: mfm.MfmNode):n is N {
    return isMfmBlock(n) || isMfmInline(n)
  }
  function isMfmNodeArray(nodes: Array<mfm.MfmNode>):nodes is Array<N> {
    return nodes.every(isMfmNode)
  }
  if (['text', 'emojiCode', 'unicodeEmoji'].includes(node.type)) {
    return [node]
  }

  if (node.children && node.children.length > 0) {
    if (isMfmNodeArray(node.children)) {
      let children:Array<N> = node.children
      return children.map(sanitizeLoop).flat()
    } else {
      return []
    }
  } else {
    return []
  }
}

export function sanitize(nodes:Array<mfm.MfmNode>):Array<mfm.MfmNode> {
  return nodes.map(n => sanitizeLoop(n)).flat()
}

function tokenize(mfm:Array<mfm.MfmNode>):Array<string> {
  let tokens:Array<string | undefined> = mfm.map(node => {
    if (node.type == 'text') {
      let options = {}
      if (Config.mecabDicDir) options = {...options, dicdir: Config.mecabDicDir}
      return wakatiSync(node.props.text, options).flat()
    }
    if (node.type == 'unicodeEmoji') {
      return node.props.emoji
    }
    if (node.type == 'emojiCode') {
      return `:${node.props.name}:`
    }
  }).flat()
  if (tokens.length > 0 && tokens[0] === '') {
    tokens = tokens.slice(1)
  }
  tokens = tokens.map(t => t === '' ? "\n" : t)
  if (isStringArray(tokens)) {
    return tokens
  } else {
    return []
  }
}

function createTokenChunk(tokens: Array<string>):Array<Array<string>> {
  if (!tokens || tokens.length <= 0) return []
  if (tokens.length < CHUNK_SIZE) return [[...tokens]]
  let lines:Array<Array<string>> = [[]]
  tokens.forEach((t)=> {
    const lastIdx = lines.length - 1
    lines[lastIdx].push(t)
    if (endLetters.includes(t)) {
      lines.push([])
    }
  })
  let chunks:Array<Array<string>> = []
  lines.forEach(line=>{
    line.forEach((token, i, arr) =>{
      if (i > arr.length - CHUNK_SIZE && token === "\n") return
      let res = arr.slice(i, i + CHUNK_SIZE)
      chunks.push(res)
    })
  })

  return chunks
}

function selectChunk(chunks:Array<Array<string>>, start:Array<string>):Array<string> {
  let matched = chunks.filter(chunk => start.every((el, i) => chunk?.[i] === el)).filter(chunk => chunk.length !== start.length)
  if (matched.length === 0) return ['\n']
  let selectedIdx = Math.floor(Math.random() * matched.length)

  return matched[selectedIdx]
}

function createResultChunk(chunks:Array<Array<string>>, start: Array<string>) {
  let result:Array<[number, Array<string>]> = [[0, start]]

  let cnt = 0
  // cnt条件未満または最後のチャンクの最後のトークンが指定された文字列でないとき
  while(cnt < 50 && !["\n",'。',"　"].includes(result?.slice(-1)?.[0]?.[1]?.slice(-1)?.[0])) {
    const this_match_length = match_length()
    if (result.length > 0) {
      const lastChunk = result[result.length - 1]
      const lastWords = lastChunk[1].slice(-this_match_length)
      let selected = selectChunk(chunks, lastWords)
      result.push([this_match_length, selected])

      cnt += 1
    }
  }
  return result
}

function chunkToString(chunks:Array<[number, Array<string>]>):string {
  if (chunks.length < 1) return ''

  let _chunks = chunks.map((chunk) => {
    return chunk[1].map((word, i, words) => {
      if ( i <= chunk[0] - 1 ) return ''
      if (words?.[i-1]?.match(emojiRegex) && word.match(/^[0-9A-z]+.*/)) {
        return `𝅳${word}`
      }
      if (words?.[i-1]?.match(/^[0-9A-z.!]{2,}/) && word.match(/^[0-9A-z.!]+/)) {
        // English
        return ` ${word}`
      }
      return word
    })
  })

  if (_chunks.length === 1) return _chunks[0].join('')

  return _chunks.map(t => t.join('')).join('')
}

function createChunksFromInput(text:string) {
  const mfmTree = mfm.parse(text);
  let sanitized = sanitize(mfmTree);
  return createTokenChunk(tokenize(sanitized))
}

function assertPairBrackets(text:string):boolean {
  const brackets:Array<string|[string, string]|[RegExp, RegExp]> = ['「」', '【】', [/\[/, /\]/], [/\(/, /\)/], '『』', '{}', '（）']
  return brackets.every(bracket => [...text.matchAll(new RegExp(bracket[0], 'g'))].length === [...text.matchAll(new RegExp(bracket[1], 'g'))].length)
}

export function createTextFromInputs(textInputs: Array<string>) {
  const chunks = textInputs.filter(i => !i.match(/^[0-9A-z\n ]+$/)).map(txt => createChunksFromInput(txt))
  //  2 + chunk.lengthトークンの文字列
  let chunksHasLotToken = chunks.filter(chunk => chunk.length >= 4 && chunk.length < 500 && !endLetters.includes(chunk[0].slice(-1)?.[0]))

  let result:string|null = null
  const retry_condition = () => {
    return result === null ||
    !assertPairBrackets(result)
  }

  while(retry_condition()){
    let startTarget = chunksHasLotToken.length >= 1 ? chunksHasLotToken : chunks
    let startWord = startTarget[Math.floor(Math.random() * startTarget.length)][0]

    result = chunkToString(createResultChunk(chunks.flat(1), startWord))
    let same = textInputs.find((i) => i.includes(result || ''))
    if (same) result = null
  }
  return result
}