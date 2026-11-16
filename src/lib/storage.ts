export type HistoryEntry = { id:string; expression:string; result:string; createdAt:number };
const HISTORY_KEY='mathpro.history.v1';
const SETTINGS_KEY='mathpro.settings.v1';
export function readHistory():HistoryEntry[]{try{return JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]') as HistoryEntry[]}catch{return[]}}
export function saveHistory(entries:HistoryEntry[]):void{localStorage.setItem(HISTORY_KEY,JSON.stringify(entries.slice(0,1000)))}
export function readSettings<T>(fallback:T):T{try{return {...fallback,...JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}')} as T}catch{return fallback}}
export function saveSettings(settings:unknown):void{localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings))}