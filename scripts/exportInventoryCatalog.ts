import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import sharp from 'sharp'
import { appInventory, jsonValue, typeValues } from './inventory/source'
import { productCatalog, catalogDoorStyles, doorLineChoices, doorTypeOptions, glassDoorCodes, finishesForStyle, doorStyleSupportsGlass } from '../src/data/productCatalog'
import { finishes, glassOptions } from '../src/data/options'
import { cladColors } from '../src/data/finishes'
import { isCustomerSelectableGlass } from '../src/data/customerGlassAvailability'
import { resolveDoorPreviewCandidates } from '../src/data/doorPreviewAssets'
import { resolveGlassMaskAsset } from '../src/data/glassMaskAssets'
import { sideliteAssetFamilyForSlab, sideliteStylesForFamily, sideliteSlabAsset, sideliteGlassMask } from '../src/data/sideliteAssets'
import * as fsl from '../src/data/fslGlass'
import * as f48sl from '../src/data/f48slGlass'
import * as ssl from '../src/data/sslGlass'
import * as s2sl from '../src/data/s2slGlass'
import * as cr14sl from '../src/data/cr14slGlass'
import { hardwareOptions, allHardwareAssets, hardwareCardAssetUrl, hardwareAssetUrl, hardwarePreviewAssetUrl, finishSwatchAssetUrl } from '../src/data/hardware'
import { doorConfigurationRules, doubleDoorLockPrepOptions } from '../src/data/doorConfigurationRules'
import { sideliteProductOptions, sideliteBuilderOptions } from '../src/data/sideliteConfigurations'
import { builderUx } from '../src/config/builderUx'
import type { DoorStyle, GridColor, GridPattern } from '../src/types'

export const FORMAT = 'hgi-inventory-phase3b-v1'
export const TABLES = ['catalog_revisions','materials','series','grains','door_line_groups','door_lines','door_line_group_members','door_styles','door_variants','finishes','door_variant_finishes','frame_materials','frame_material_finishes','door_variant_frame_materials','glass_families','glass_designs','glass_options','door_variant_glass_options','sidelite_styles','sidelite_variants','door_variant_sidelites','sidelite_variant_glass_options','hardware_brands','hardware_styles','hardware_finishes','hardware_variants','grid_profiles','grid_patterns','grid_colors','grid_widths','glass_coatings','allowed_grid_combinations','assets','door_variant_assets','glass_option_assets','sidelite_variant_assets','hardware_variant_assets','finish_assets','grid_combination_assets','catalog_change_log'] as const
export type Row = Record<string, any>
export type Catalog = Awaited<ReturnType<typeof exportInventoryCatalog>>
export const hash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex')
export function canonical(value: any): string { return JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([a],[b]) => a.localeCompare(b,'en'))) : item) }
export function uuid(key: string) { const h = hash(key); return `${h.slice(0,8)}-${h.slice(8,12)}-5${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}` }

export async function exportInventoryCatalog(commit = 'HEAD') {
  const sourceCommit = execFileSync('git',['rev-parse',`${commit}^{commit}`],{encoding:'utf8'}).trim()
  if (execFileSync('git',['status','--porcelain','--','src','public/assets'],{encoding:'utf8'}).trim()) throw new Error('Runtime source/assets are dirty; export must use the current committed catalog')
  const sources = ['src/App.tsx','src/types.ts','src/config/builderUx.ts',...readdirSync('src/data').filter(n=>n.endsWith('.ts')).map(n=>`src/data/${n}`)].sort()
  for(const path of sources)if(execFileSync('git',['show',`${sourceCommit}:${path}`],{encoding:'utf8'})!==readFileSync(path,'utf8'))throw new Error(`Source commit does not match catalog file ${path}`)
  execFileSync('git',['diff','--exit-code',sourceCommit,'--','public/assets'],{stdio:'pipe'})
  const sourceChecksum = hash(sources.map(p=>`${p}\n${readFileSync(p,'utf8')}`).join('\n'))
  const revisionId = uuid(`${FORMAT}:${sourceCommit}:${sourceChecksum}`)
  const tables = Object.fromEntries(TABLES.map(name=>[name,[] as Row[]])) as Record<typeof TABLES[number],Row[]>
  const ids = new Map<string,string>(), paths = new Map<string,string>(), issues: string[] = []
  const app = appInventory()
  function add(table: typeof TABLES[number], key: string, row: Row): string {
    const natural = `${table}:${key}`, id = uuid(`${revisionId}:${natural}`)
    if (ids.has(natural)) {
      const existing = tables[table].find(r=>r.id===id)!
      if (canonical(existing)!==canonical({id,catalog_revision_id:revisionId,...row})) throw new Error(`Conflicting duplicate ${natural}`)
      return id
    }
    ids.set(natural,id); tables[table].push({id,catalog_revision_id:revisionId,...row}); return id
  }
  const get = (table: string,key: string) => { const id=ids.get(`${table}:${key}`); if(!id)throw new Error(`Missing ${table}:${key}`);return id }
  const fact = (table: typeof TABLES[number],key:string,name:string,extra:Row={}) => add(table,key,{legacy_id:key,display_name:name,status:'active',customer_selectable:true,display_order:tables[table].find(r=>r.id===ids.get(`${table}:${key}`))?.display_order??tables[table].length,...extra})
  const note = (value:any) => canonical(jsonValue(value))
  function asset(path?:string|null) {
    if(!path)return null
    if(!path.startsWith('/assets/'))throw new Error('Unexpected inventory asset path')
    if(paths.has(path))return paths.get(path)!
    const file=resolve('public',decodeURIComponent(path.split('?')[0]).slice(1))
    if(!file.startsWith(resolve('public/assets')+'/'))throw new Error('Asset escaped inventory directory')
    if(!existsSync(file))issues.push(`Source-declared asset absent: ${path}; path preserved, metadata unavailable. HGI review required.`)
    const id=add('assets',path,{current_path:path,content_version:1,source:'Door-Builder hardcoded inventory',provenance:sourceCommit})
    paths.set(path,id);return id
  }
  function binding(table: typeof TABLES[number],parentColumn:string,parent:string,path:string|null|undefined,role:string,view='',order=0) {
    const assetId=asset(path); if(!assetId)return
    add(table,`${parent}:${role}:${view}:${assetId}`,{[parentColumn]:parent,asset_id:assetId,role,...(table==='finish_assets'?{}:{view_key:view}),display_order:order})
  }
  const groupFor = (lineId:string) => doorLineChoices.find(group=>group.lineIds.includes(lineId))!
  const materialFor = (lineId:string) => lineId.includes('steel')?'steel':'fiberglass'
  const familyFor = (lineId:string,grain?:string) => sideliteAssetFamilyForSlab({doorLineId:groupFor(lineId).id,grain})!
  for(const name of ['steel','fiberglass'])fact('materials',name,name==='steel'?'Steel':'Fiberglass')
  for(const group of doorLineChoices) {
    fact('series',group.id,group.name,{material_id:get('materials',materialFor(group.lineIds[0])),description:group.description,notes:note({source:group})})
    fact('door_line_groups',group.id,group.name,{description:group.description,notes:note({source:group})});asset(group.image)
  }
  for(const grain of [...new Set(productCatalog.flatMap(line=>line.grains))])fact('grains',grain,grain)
  for(const line of productCatalog) {
    const group=groupFor(line.id)
    fact('door_lines',line.id,line.name,{material_id:get('materials',materialFor(line.id)),series_id:get('series',group.id),internal_code:line.id,notes:note({grains:line.grains,allowsColors:line.allowsColors,paintOnly:group.paintOnly??false,autoGrain:group.autoGrain??null})})
    add('door_line_group_members',line.id,{door_line_group_id:get('door_line_groups',group.id),door_line_id:get('door_lines',line.id),display_order:productCatalog.indexOf(line)})
  }
  for(const finish of finishes) {
    const id=fact('finishes',finish.id,finish.name,{finish_type:finish.finishType,hex_color:finish.color,description:finish.description,notes:note({source:finish})})
    binding('finish_assets','finish_id',id,finish.image,'finish_swatch')
  }
  for(const kind of ['timber','clad']) {
    const frame=fact('frame_materials',kind,kind==='timber'?'Timber':'Clad',{frame_kind:kind,customer_selectable:builderUx.showJambMaterialSelection,notes:note({hiddenSelector:!builderUx.showJambMaterialSelection})})
    for(const finish of finishes.filter(f=>kind==='timber'||cladColors.some(c=>`paint-${c.id}`===f.id))) add('frame_material_finishes',`${kind}:${finish.id}`,{frame_material_id:frame,finish_id:get('finishes',finish.id),customer_selectable:builderUx.showJambColorSelection,display_order:finishes.indexOf(finish),notes:kind==='timber'?'Additionally filtered by current door variant and finish kind in App.':'Restricted clad paint palette; existing first-available fallback retained in application.'})
  }
  const uniqueGlass = new Map<string,typeof glassOptions[number]>()
  const occurrences = new Map<string,number[]>()
  glassOptions.forEach((glass,index)=>{
    if(uniqueGlass.has(glass.id)&&canonical(uniqueGlass.get(glass.id))!==canonical(glass))throw new Error(`Non-identical duplicate glass ID ${glass.id}`)
    uniqueGlass.set(glass.id,glass);occurrences.set(glass.id,[...(occurrences.get(glass.id)||[]),index])
  })
  issues.push('paris: two identical source rows consolidated; original array positions retained in notes. HGI should confirm canonical ownership.')
  const visibleGlass = (style:DoorStyle,lineId:string) => {
    const group=groupFor(lineId),codes=style.variants.filter(v=>group.lineIds.includes(v.lineId)).map(v=>v.code)
    if(!doorStyleSupportsGlass(style,group.id))return []
    return [...uniqueGlass.values()].filter(o=>codes.some(c=>o.overlaysByDoorStyle[c]) && !(codes.includes('F')&&app.legacyFullLiteGlassIds.has(o.id)) && !(codes.includes('S')&&app.legacySHalfLiteClearGlassIds.has(o.id)) && !(codes.some(c=>['F48','F482'].includes(c))&&app.legacyF48ClearGlassIds.has(o.id)) && (!codes.some(c=>['F48','F482'].includes(c))||app.f48GlassOptionIds.has(o.id)) && !(codes.includes('SAT')&&app.glassCategory(o)==='privacy') && isCustomerSelectableGlass(o))
  }
  const reachable = new Set(catalogDoorStyles.flatMap(style=>style.variants.flatMap(v=>visibleGlass(style,v.lineId).map(g=>g.id))))
  for(const family of [...app.glassCategoryChoices,app.retroGlassCategory]){fact('glass_families',family.id,family.name,{description:family.description,notes:family.id==='retro'?'Presentation grouping for selected openings; not an additional physical glass family.':null});asset(family.image)}
  const doorGlassIds = new Map<string,string>()
  for(const glass of uniqueGlass.values()) {
    const selectable=reachable.has(glass.id), status=selectable?'active':'legacy_only'
    const design=fact('glass_designs',`door:${glass.id}`,glass.name,{glass_family_id:get('glass_families',app.glassCategory(glass)),status,customer_selectable:selectable,renderable:true,notes:note({sourceNamespace:'door',originalLegacyId:glass.id})})
    const openings=Object.keys(glass.overlaysByDoorStyle)
    for(const opening of openings.length?openings:['']) {
      const id=add('glass_options',`door:${glass.id}:${opening}`,{glass_design_id:design,legacy_id:glass.id,opening_code:opening||null,scope:'door',display_name:glass.name,status,customer_selectable:selectable,renderable:true,display_order:occurrences.get(glass.id)![0],notes:note({source:glass,sourceRowPositions:occurrences.get(glass.id),historicalRenderable:true})})
      doorGlassIds.set(`${glass.id}:${opening}`,id)
      binding('glass_option_assets','glass_option_id',id,glass.thumbnailPath,'thumbnail')
      if(opening){binding('glass_option_assets','glass_option_id',id,glass.overlaysByDoorStyle[opening],'glass_overlay',opening);binding('glass_option_assets','glass_option_id',id,resolveGlassMaskAsset(opening),'mask',opening)}
    }
  }
  const sideCatalogs:any={fsl:{options:fsl.fslGlassOptions,standard:fsl.fslStandardStyleRules,lowE:fsl.fslLowEStyleRules,grid:fsl.fslGridAsset,prairie:fsl.fslPrairieGridAsset,arts:fsl.fslArtsAndCraftsGridAsset,prairiePattern:'5 Lite',sdl:['3 Lite','4 Lite','5 Lite']},f48sl:{options:f48sl.f48slGlassOptions,standard:f48sl.f48slStandardStyleRules,lowE:f48sl.f48slLowEStyleRules,grid:f48sl.f48slGridAsset,prairie:f48sl.f48slPrairieGridAsset,arts:f48sl.f48slArtsAndCraftsGridAsset,prairiePattern:'4 Lite',sdl:['2 Lite','3 Lite','4 Lite']},ssl:{options:ssl.sslGlassOptions,standard:ssl.sslStandardStyleRules,lowE:ssl.sslLowEStyleRules,grid:ssl.sslGridAsset,prairie:ssl.sslPrairieGridAsset,arts:ssl.sslArtsAndCraftsGridAsset,prairiePattern:'3 Lite',sdl:['3 Lite']},s2sl:{options:s2sl.s2slGlassOptions,standard:s2sl.s2slStyleRules,lowE:s2sl.s2slStyleRules,sdl:[]},cr14sl:{options:cr14sl.cr14slGlassOptions,standard:cr14sl.cr14slStyleRules,lowE:cr14sl.cr14slStyleRules,sdl:[]}}
  const sideGlassIds=new Map<string,string>()
  for(const style of app.sideliteStyleOptions) {
    fact('sidelite_styles',style.id,style.name,{internal_code:style.id.toUpperCase(),notes:note({source:style})})
    const uniqueSide=new Map<string,any>()
    for(const option of sideCatalogs[style.id].options){if(uniqueSide.has(option.id)&&canonical(uniqueSide.get(option.id))!==canonical(option))throw new Error(`Non-identical duplicate sidelite glass ID ${style.id}:${option.id}`);uniqueSide.set(option.id,option)}
    for(const option of uniqueSide.values()) {
      const selectable=isCustomerSelectableGlass(option)
      const design=fact('glass_designs',`sidelite:${style.id}:${option.id}`,option.name,{glass_family_id:get('glass_families',option.category),status:selectable?'active':'legacy_only',customer_selectable:selectable,renderable:true})
      const positions=sideCatalogs[style.id].options.map((o:any,i:number)=>o.id===option.id?i:-1).filter((i:number)=>i>=0)
      const id=add('glass_options',`sidelite:${style.id}:${option.id}`,{glass_design_id:design,legacy_id:option.id,scope:'sidelite',opening_code:style.id.toUpperCase(),display_name:option.name,status:selectable?'active':'legacy_only',customer_selectable:selectable,renderable:true,display_order:positions[0],notes:note({source:option,slab:style.id,sourceRowPositions:positions})})
      sideGlassIds.set(`${style.id}:${option.id}`,id)
      binding('glass_option_assets','glass_option_id',id,option.asset,'glass_overlay',style.id.toUpperCase())
    }
  }
  for(const style of catalogDoorStyles) {
    fact('door_styles',style.id,style.name,{internal_code:style.id,product_code:style.code,description:style.description,notes:note({source:style,customerDisplayName:app.doorCatalogModelName(style.name)})})
    for(const variant of style.variants) {
      const line=productCatalog.find(l=>l.id===variant.lineId)!,group=groupFor(line.id),grain=line.grains[0]
      const variantId=fact('door_variants',`${style.id}:${line.id}`,style.name,{door_style_id:get('door_styles',style.id),door_line_id:get('door_lines',line.id),grain_id:grain?get('grains',grain):null,internal_code:variant.code,product_code:variant.code,opening_code:variant.code,supports_glass:glassDoorCodes.has(variant.code),notes:note({source:variant})})
      const subset={...style,variants:[variant]}
      const allowedFinishes=finishesForStyle(subset,finishes,group.id,grain)
      for(const finish of allowedFinishes)add('door_variant_finishes',`${variantId}:${finish.id}`,{door_variant_id:variantId,finish_id:get('finishes',finish.id),customer_selectable:true,display_order:finishes.indexOf(finish)})
      for(const kind of ['timber','clad'])add('door_variant_frame_materials',`${variantId}:${kind}`,{door_variant_id:variantId,frame_material_id:get('frame_materials',kind),customer_selectable:builderUx.showJambMaterialSelection,notes:'Retained internal frame type; current customer selector visibility is controlled in application.'})
      const selected=new Set(visibleGlass(style,line.id).map(g=>g.id))
      for(const glass of uniqueGlass.values())if(glass.overlaysByDoorStyle[variant.code])add('door_variant_glass_options',`${variantId}:${glass.id}`,{door_variant_id:variantId,glass_option_id:doorGlassIds.get(`${glass.id}:${variant.code}`)!,customer_selectable:selected.has(glass.id),display_order:occurrences.get(glass.id)![0],notes:selected.has(glass.id)?null:'Retained overlay relationship; excluded by current UI visibility/legacy rules.'})
      binding('door_variant_assets','door_variant_id',variantId,style.image,'thumbnail')
      binding('door_variant_assets','door_variant_id',variantId,resolveGlassMaskAsset(variant.code),'mask',variant.code)
      for(const kind of ['paint','stain'] as const)if(allowedFinishes.some(f=>f.finishType===kind)){
        const product={doorTypeLabel:'Door Line' as const,doorType:line.name,doorTypes:[line.name],matchingVariants:[variant],styleCodes:[variant.code],grain}
        resolveDoorPreviewCandidates(subset,kind,product,grain).forEach((path,index)=>binding('door_variant_assets','door_variant_id',variantId,path,'slab_render',kind,index))
      }
      const family=familyFor(line.id,grain)
      for(const slab of sideliteStylesForFamily(family)) {
        const side=fact('sidelite_variants',`${line.id}:${slab}`,app.sideliteStyleOptions.find((o:any)=>o.id===slab).name,{sidelite_style_id:get('sidelite_styles',slab),material_id:get('materials',materialFor(line.id)),grain_id:grain?get('grains',grain):null,internal_code:`${line.id}:${slab}`,product_code:slab.toUpperCase(),opening_code:slab.toUpperCase(),asset_family_alias:family,notes:note({doorLineId:line.id,assetFamilyAlias:family})})
        add('door_variant_sidelites',`${variantId}:${side}`,{door_variant_id:variantId,sidelite_variant_id:side,customer_selectable:true,display_order:sideliteStylesForFamily(family).indexOf(slab)})
        binding('sidelite_variant_assets','sidelite_variant_id',side,sideliteSlabAsset(family,slab),'slab_render')
        binding('sidelite_variant_assets','sidelite_variant_id',side,sideliteGlassMask(family,slab),'mask')
        for(const option of sideCatalogs[slab].options)add('sidelite_variant_glass_options',`${side}:${option.id}`,{sidelite_variant_id:side,glass_option_id:sideGlassIds.get(`${slab}:${option.id}`)!,customer_selectable:isCustomerSelectableGlass(option),display_order:sideCatalogs[slab].options.findIndex((o:any)=>o.id===option.id)})
      }
    }
  }
  for(const hardware of hardwareOptions) {
    const brand=fact('hardware_brands',hardware.manufacturer,hardware.manufacturer)
    const style=fact('hardware_styles',`${hardware.manufacturer}:${hardware.style}`,hardware.style,{hardware_brand_id:brand})
    const finish=fact('hardware_finishes',hardware.finish,hardware.finish,{hardware_brand_id:null,hex_color:hardware.color,notes:note({swatchPath:finishSwatchAssetUrl(hardware.finish)})})
    asset(finishSwatchAssetUrl(hardware.finish))
    const id=fact('hardware_variants',hardware.id,`${hardware.manufacturer} ${hardware.style} - ${hardware.finish}`,{hardware_style_id:style,hardware_finish_id:finish,notes:note({source:hardware,functionalType:hardware.type,knobOnlyCrop:hardware.crop})})
    binding('hardware_variant_assets','hardware_variant_id',id,hardwareCardAssetUrl(hardware),'hardware_card')
    for(const authored of allHardwareAssets.filter(a=>a.manufacturer===hardware.manufacturer&&a.style===hardware.style&&a.finish===hardware.finish))binding('hardware_variant_assets','hardware_variant_id',id,hardwareAssetUrl(authored.asset),authored.view==='Exterior'?'exterior_hardware':'interior_hardware',`authored:${authored.view}:${authored.handing}`)
    for(const swing of app.doorSwingOptions)for(const view of ['Exterior','Interior'] as const)binding('hardware_variant_assets','hardware_variant_id',id,hardwarePreviewAssetUrl(hardware,view,swing),view==='Exterior'?'exterior_hardware':'interior_hardware',`preview:${view}:${swing.id}`)
  }
  const profiles=typeValues('GridStyle'),patterns=typeValues('GridPattern'),colors=typeValues('GridColor'),widths=typeValues('GridWidth'),coatings=typeValues('GlassCoating')
  profiles.forEach(v=>fact('grid_profiles',v,v));patterns.forEach(v=>fact('grid_patterns',v,v));
  fact('grid_patterns','__no_pattern_selection__','No pattern selection',{customer_selectable:false,notes:'Internal schema sentinel only: main-door Prairie has no selected numeric lite pattern. Never show this as a customer product option.'})
  colors.forEach(v=>fact('grid_colors',v,v,{hex_color:/^#[a-f0-9]{6}$/i.test(app.gridColorValues[v])?app.gridColorValues[v]:null,notes:note({appearance:app.gridColorValues[v]})}));widths.forEach(v=>{const [n,d]=v.replace('"','').split('/').map(Number);fact('grid_widths',v,v,{width_inches:n/d})});coatings.forEach(v=>fact('glass_coatings',v,v))
  const combos=new Map<string,Row>()
  function gridCombo(glassId:string,profile:string,pattern:string,color:string,width:string|null,coating:string,location:string,path?:string|null) {
    const key=[glassId,profile,pattern,color,width||'',coating].join('|')
    if(!combos.has(key))combos.set(key,{glass_option_id:glassId,grid_profile_id:get('grid_profiles',profile),grid_pattern_id:get('grid_patterns',pattern),grid_color_id:get('grid_colors',color),grid_width_id:width?get('grid_widths',width):null,glass_coating_id:get('glass_coatings',coating),width_selection_mode:width?'specific':'none',customer_selectable:true,display_order:combos.size,contexts:[]})
    const row=combos.get(key)!,context={location,path:path??null};if(!row.contexts.some((c:any)=>canonical(c)===canonical(context)))row.contexts.push(context)
  }
  function ruleGrid(glass:string,standard:any,low:any,resolvePath:(profile:string,pattern:string,color:string)=>string|null) {
    const signatures=new Map<string,{profile:string,pattern:string,color:string,width:string|null,standard:boolean,low:boolean}>()
    for(const [kind,rules] of [['standard',standard],['low',low]] as const)for(const [profile,byPattern] of Object.entries<any>(rules))for(const [pattern,byColor] of Object.entries<any>(byPattern))for(const [color,choices] of Object.entries<any>(byColor))for(const width of choices.length?choices:[null]){
      const key=[profile,pattern,color,width||''].join('|'),entry=signatures.get(key)||{profile,pattern,color,width,standard:false,low:false};entry[kind]=true;signatures.set(key,entry)
    }
    for(const e of signatures.values())gridCombo(glass,e.profile,e.pattern,e.color,e.width,e.standard&&e.low?'Standard / No Low-E or Low-E':e.low?'Low-E':'Standard / No Low-E','internal',resolvePath(e.profile,e.pattern,e.color))
  }
  for(const [code,glassKey,prefix] of [['F','f-clear-grids',''],['F48','f48-clear-grids','f48'],['F482','f48-clear-grids','f48'],['S','s-clear-grids','s']]) {
    const glass=doorGlassIds.get(`${glassKey}:${code}`);if(!glass)continue
    const standard={Flat:app[prefix?`${prefix}StandardFlatRules`:'flatGridRules'],Contoured:prefix?app[`${prefix}StandardContouredRules`]:{'15 Lite':{Champagne:['11/16"']}},Prairie:{'__no_pattern_selection__':app[prefix?`${prefix}StandardPrairieRules`:'prairieGridRules']}}
    const low={Flat:app[prefix?`${prefix}LowEFlatRules`:'lowEFlatGridRules'],Contoured:app[prefix?`${prefix}LowEContouredRules`:'lowEContouredRules'],'Arts & Crafts':app.lowEArtsRules,Prairie:{'__no_pattern_selection__':app[prefix?`${prefix}LowEPrairieRules`:'lowEPrairieGridRules']}}
    const path=(profile:string,pattern:string,color:string)=>profile==='Arts & Crafts'?`/assets/hgi-assets/Glass/F/INTERNAL GRIDS/FART${app.internalGridPatternCodes[pattern]}WH.webp`:profile==='Prairie'?app.prairieGridAssets[color]||null:code==='S'?app.sInternalGridAsset(pattern,color):prefix?app.f48InternalGridAsset(pattern,color):profile==='Contoured'?app.contouredGridAssets[pattern]?.[color]||null:app.internalGridAsset(pattern,color)
    ruleGrid(glass,standard,low,path)
    for(const location of ['external','sdl']) {
      if(prefix==='f48'&&location==='external')continue
      const allowed=location==='external'?(code==='S'?['4 Lite','9 Lite']:['8 Lite','10 Lite','15 Lite']):(code==='S'?['9 Lite']:prefix==='f48'?['4 Lite']:['6 Lite','8 Lite','15 Lite'])
      for(const pattern of allowed)gridCombo(glass,'Flat',pattern,'White',null,location==='sdl'?'Low-E':code==='S'?pattern==='4 Lite'?'Standard / No Low-E or Low-E':'Low-E':pattern==='8 Lite'?'Standard / No Low-E, Low-E or Low-E Plus':'Low-E or Low-E Plus',location,path('Flat',pattern,'White'))
    }
  }
  for(const [slab,catalog] of Object.entries<any>(sideCatalogs)) {
    const glass=sideGlassIds.get(`${slab}:clear-grids`);if(!glass)continue
    const path=(profile:string,pattern:string,color:string)=>profile==='Prairie'?catalog.prairie(color):profile==='Arts & Crafts'?catalog.arts(color):catalog.grid(pattern,color)
    ruleGrid(glass,catalog.standard,catalog.lowE,path)
    for(const pattern of catalog.sdl)gridCombo(glass,'Flat',pattern,'Bronze',null,'Standard / No Low-E or Low-E','sdl',catalog.grid(pattern,'Bronze'))
  }
  for(const [key,{contexts,...row}] of combos) {
    const id=add('allowed_grid_combinations',key,{...row,notes:note({contexts,widthSemantics:row.width_selection_mode==='none'?'Valid combination without width selection; absence of a row means unavailable.':'Specific supported bar width.'})})
    for(const context of contexts){if(context.path&&existsSync(resolve('public',context.path.slice(1))))binding('grid_combination_assets','grid_combination_id',id,context.path,'grid_overlay',context.location);else if(context.path)issues.push(`Grid artwork fallback/absence: ${context.path}; combination retained, no invented asset.`)}
  }
  // Keep the source grid dictionaries and ancillary product metadata losslessly
  // in the export and revision provenance; no UI navigation is moved to SQL.
  const sourceFacts=jsonValue({app,doorTypeOptions,doorConfigurationRules,doubleDoorLockPrepOptions,sideliteProductOptions,sideliteSingleOptions:sideliteBuilderOptions('single'),sideliteDoubleOptions:sideliteBuilderOptions('french'),builderUx,sideGridRules:Object.fromEntries(Object.entries(sideCatalogs).map(([key,c]:any)=>[key,{standard:c.standard,lowE:c.lowE,prairiePattern:c.prairiePattern,sdl:c.sdl}]))})
  function collectAssets(value:any){if(typeof value==='string'&&value.startsWith('/assets/'))asset(value);else if(value&&typeof value==='object')Object.values(value).forEach(collectAssets)}
  collectAssets(sourceFacts)
  for(const row of tables.assets) {
    const file=resolve('public',decodeURIComponent(row.current_path.split('?')[0]).slice(1))
    if(!existsSync(file)){Object.assign(row,{mime_type:null,width:null,height:null,byte_size:null,checksum:null,has_transparency:null,notes:'Source-declared path does not exist locally; preserved for parity, not asserted usable.'});continue}
    const bytes=readFileSync(file)
    const metadata=await sharp(bytes).metadata()
    Object.assign(row,{mime_type:metadata.format==='svg'?'image/svg+xml':`image/${metadata.format}`,width:metadata.width??null,height:metadata.height??null,byte_size:bytes.length,checksum:hash(bytes),has_transparency:metadata.hasAlpha??false})
  }
  issues.push('Grid location is preserved in notes.contexts because Phase 2 allowed_grid_combinations has no location column; future shadow adapter must compare those contexts, not only profile/width.')
  issues.push('Main-door Prairie has no numeric pattern selection. An internal non-selectable grid-pattern sentinel satisfies the Phase 2 non-null FK; it is not a new customer option.')
  issues.push('No physical stock, manufacturing size or new hardware restrictions invented; catalog mirrors current application eligibility, not supplier stock.')
  const catalogChecksum=hash(canonical({tables,sourceFacts}))
  tables.catalog_revisions=[{id:revisionId,status:'draft',source_commit:sourceCommit,published_at:null,published_by:null,notes:note({format:FORMAT,sourceChecksum,catalogChecksum,sourceFacts,issues:[...new Set(issues)].sort()})}]
  tables.catalog_change_log=[{id:uuid(`${revisionId}:import-log`),catalog_revision_id:revisionId,entity_table:'catalog_revisions',entity_id:revisionId,action:'import',change_summary:`${FORMAT}: deterministic DEV import; unpublished`,after_data:{catalogChecksum,sourceCommit}}]
  for(const rows of Object.values(tables))rows.sort((a,b)=>a.id.localeCompare(b.id,'en'))
  return {format:FORMAT,sourceCommit,sourceChecksum,catalogChecksum,revisionId,tables,counts:Object.fromEntries(TABLES.map(t=>[t,tables[t].length])),sourceCounts:{doorLines:productCatalog.length,doorStyles:catalogDoorStyles.length,doorVariants:catalogDoorStyles.flatMap(s=>s.variants).length,finishes:finishes.length,mainGlassRows:glassOptions.length,mainGlassUnique:uniqueGlass.size,reachableMainGlassIds:reachable.size,sideliteGlassRows:Object.values<any>(sideCatalogs).reduce((n,c)=>n+c.options.length,0),hardwareProducts:hardwareOptions.length,hardwareArtworkRows:allHardwareAssets.length},issues:[...new Set(issues)].sort()}
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  exportInventoryCatalog(process.argv.find(arg=>arg.startsWith('--source-commit='))?.split('=')[1]).then(catalog=>console.log(JSON.stringify(process.argv.includes('--full')?catalog:{...catalog,tables:undefined},null,2))).catch(error=>{console.error(error.message);process.exitCode=1})
}
