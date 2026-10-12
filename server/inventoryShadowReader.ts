import { devCredentials } from '../scripts/importInventoryCatalog'
import { TABLES } from '../scripts/exportInventoryCatalog'
import { EXPECTED_REVISION, EXPECTED_COMMIT, EXPECTED_DIGEST, type DevCatalog, type CatalogRow } from '../src/inventory-shadow/types'

/** Server-only, GET-only. Never imported by the browser; no public API endpoint. */
export async function readDevShadowCatalog(timeoutMs=12000,fetcher:typeof fetch=fetch): Promise<DevCatalog> {
  const {origin,key}=devCredentials()
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs)
  async function get(path:string){const response=await fetcher(`${origin}/rest/v1/${path}`,{method:'GET',redirect:'error',headers:{apikey:key,Authorization:`Bearer ${key}`},signal:controller.signal});if(!response.ok)throw new Error(`DEV inventory read failed (${response.status})`);return response.json()}
  try {
    const revisions=await get(`catalog_revisions?id=eq.${EXPECTED_REVISION}&select=*`) as CatalogRow[]
    if(revisions.length!==1)throw new Error('Expected draft revision not found uniquely')
    const revision=revisions[0],notes=JSON.parse(revision.notes||'{}')
    if(revision.status!=='draft'||revision.source_commit!==EXPECTED_COMMIT||notes.catalogChecksum!==EXPECTED_DIGEST||notes.format!=='hgi-inventory-phase3b-v1')throw new Error('Pinned draft provenance/status mismatch; no alternate revision selected')
    const tables:DevCatalog['tables']={catalog_revisions:revisions}
    const targets=TABLES.filter(t=>t!=='catalog_revisions'&&t!=='catalog_change_log')
    for(let i=0;i<targets.length;i+=6)await Promise.all(targets.slice(i,i+6).map(async table=>{
      const rows:CatalogRow[]=[]
      for(let offset=0;;offset+=500){const page=await get(`${table}?catalog_revision_id=eq.${EXPECTED_REVISION}&select=*&order=id&limit=500&offset=${offset}`) as CatalogRow[];rows.push(...page);if(page.length<500)break;if(offset>20000)throw new Error('Unexpectedly large shadow catalog')}
      if(rows.some(row=>row.catalog_revision_id!==EXPECTED_REVISION))throw new Error('Cross-revision shadow data')
      tables[table]=rows
    }))
    return {revision,tables}
  }finally{clearTimeout(timer)}
}
