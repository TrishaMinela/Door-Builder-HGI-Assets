import { defineConfig, loadEnv } from 'vite'
export default defineConfig(({command,mode})=>({
  plugins: command==='serve'&&mode!=='production'&&loadEnv(mode,process.cwd(),'VITE_').VITE_INVENTORY_SHADOW==='true' ? [{
    name:'hgi-local-inventory-shadow',apply:'serve' as const,
    async configureServer(server){
      const {readDevShadowCatalog}=await import('./server/inventoryShadowReader')
      const {hardcodedSnapshot,databaseSnapshot}=await import('./server/inventoryShadowSemantics')
      const {compareSnapshots}=await import('./src/inventory-shadow/compare')
      const {safeContext}=await import('./src/inventory-shadow/types')
      let cached:Awaited<ReturnType<typeof readDevShadowCatalog>>|undefined,expires=0
      let disabledReason:string|undefined
      let pending:Promise<Awaited<ReturnType<typeof readDevShadowCatalog>>>|undefined
      const read=async()=>{if(disabledReason)throw new Error(disabledReason);if(cached&&Date.now()<expires)return cached;if(!pending)pending=readDevShadowCatalog().then(value=>{cached=value;expires=Date.now()+60000;return value}).catch(error=>{if(/non-allowlisted|credential|revision|provenance|status mismatch/.test(error.message))disabledReason='DEV target, credential or pinned draft invalid; shadow disabled until server restart';throw error}).finally(()=>{pending=undefined});return pending}
      server.middlewares.use('/__dev/inventory-shadow/compare',async(req,res)=>{
        res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json')
        if(req.method!=='POST'){res.statusCode=405;res.end(JSON.stringify({status:'unavailable',reason:'DEV comparison requires POST'}));return}
        try{
          if(req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host){res.statusCode=403;res.end('{}');return}
          let body=''
          for await(const chunk of req){body+=chunk;if(body.length>4096)throw new Error('Shadow context too large')}
          const context=safeContext(JSON.parse(body))
          const catalog=await read()
          const reports=compareSnapshots(hardcodedSnapshot(context),databaseSnapshot(catalog,context),context)
          res.end(JSON.stringify({status:'ok',reports}))
        }catch(error){const message=error instanceof Error?error.message:'';const reason=/^(DEV |Expected draft|Pinned draft|Refusing non-allowlisted|Server-only)/.test(message)?message:error instanceof Error&&error.name==='AbortError'?'DEV catalog read timed out':'DEV shadow request unavailable';console.warn('[inventory-shadow:unavailable]',{reason});res.end(JSON.stringify({status:'unavailable',reason}))}
      })
    }
  }] : []
}))
