export function isStringArray(arr:Array<any>):arr is Array<string> {
  return arr.every(v => typeof v === 'string')
}