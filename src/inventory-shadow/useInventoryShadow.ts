import { useEffect } from 'react'
import { safeContext, type ShadowContext, type ShadowReport } from './types'
import { reportShadow, reportUnavailable } from './report'

/** Diagnostics only. No setters, result-derived state, UI effects or fallback inventory. */
export function useInventoryShadow(context: ShadowContext, active: boolean) {
  const key=JSON.stringify(safeContext(context))
  useEffect(()=>{
    if(!active || !import.meta.env.DEV || import.meta.env.MODE==='production' || import.meta.env.VITE_INVENTORY_SHADOW!=='true')return
    const controller=new AbortController()
    let disposed=false
    const timer=window.setTimeout(async()=>{
      const timeout=window.setTimeout(()=>controller.abort(),15000)
      try {
        const response=await fetch('/__dev/inventory-shadow/compare',{method:'POST',headers:{'Content-Type':'application/json'},body:key,signal:controller.signal})
        if(!response.ok)throw new Error('DEV shadow service unavailable')
        const result=await response.json() as {status:string;reports?:ShadowReport[];reason?:string}
        if(disposed)return
        if(result.status==='ok'&&Array.isArray(result.reports))reportShadow(result.reports)
        else reportUnavailable(result.reason||'Pinned DEV catalog unavailable')
      }catch{if(!disposed)reportUnavailable('Request failed or timed out')}
      finally{window.clearTimeout(timeout)}
    },350)
    return()=>{disposed=true;window.clearTimeout(timer);controller.abort()}
  },[active,key])
}
