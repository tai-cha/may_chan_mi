import * as mfm from 'mfm-js'
import { isMfmBlock } from 'mfm-js/built/node';
import { wakatiSync } from "@enjoyjs/node-mecab"
import { isStringArray } from '@/utils/type_checker';
import * as Config from '@/utils/config'

const emojiRegex = /:[0-9A-z_\-]+:/

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
  if (tokens.length < 2) return [tokens]
  let lines:Array<Array<string>> = [[]]
  tokens.forEach((t)=> {
    const lastIdx = lines.length - 1
    lines[lastIdx].push(t)
    if (["\n", "。", "　"].includes(t)) {
      lines.push([])
    }
  })
  let chunks:Array<Array<string>> = []
  lines.forEach(line=>{
    line.forEach((token, i, arr) =>{
      if (i > arr.length - 2 && token === "\n") return
      let res = arr.slice(i, i + 2)
      res = res.map((word, idx) => {
        if ( idx > 0 && res[idx - 1].match(emojiRegex) && word.match(/^[0-9A-z]+.*/) ) {
          return` ${word}`
        }
        return word
      })
      chunks.push(res)
    })
  })

  return chunks
}

function selectChunk(chunks:Array<Array<string>>, start:string):Array<string> {
  let matched = chunks.filter(chunk => chunk[0] === start)
  let selectedIdx = Math.floor(Math.random() * matched.length)

  return matched[selectedIdx]
}

function createResultChunk(chunks:Array<Array<string>>, start: Array<string>) {
  let result = [start]

  let cnt = 0
  while(cnt < 15 && !["\n",'。',"　"].includes(result[result.length -1][result[result.length -1].length - 1])) {
    const lastChunk = result[result.length - 1]
    const lastWord = lastChunk[lastChunk.length - 1]
    let selected = selectChunk(chunks, lastWord)
    if (lastWord.match(emojiRegex) && selected?.[1]?.match(/^[0-9A-z]+.*/)) {
      selected[1] = ` ${selected[1]}`
    }
    result.push(selected)
    cnt += Math.floor(Math.random() * 3) + 1
  }
  return result
}

function chunkToString(chunks:Array<Array<String>>):string {
  return [
    chunks[0].join(''),
    chunks.slice(1).map(t => t.slice(1).join('')).join('')
  ].join('')
}

function createChunksFromInput(text:string) {
  const mfmTree = mfm.parse(text);
  let sanitized = sanitize(mfmTree);
  return createTokenChunk(tokenize(sanitized))
}

export function createTextFromInputs(textInputs: Array<string>) {
  const chunksArray = textInputs.map(txt => createChunksFromInput(txt))
  let startWord = chunksArray[Math.floor(Math.random() * chunksArray.length)][0]

  return chunkToString(createResultChunk(chunksArray.flat(1), startWord))
}