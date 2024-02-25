export function isStringArray(arr:Array<any>):arr is Array<string> {
  return arr.every(v => typeof v === 'string')
}

export function isFiniteAndPositive(num?:number|null):num is number {
  if (typeof num === 'undefined' || num === null) return false
  return Number.isFinite(num) && num > 0
}