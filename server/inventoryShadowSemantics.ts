import type { ShadowContext, Snapshot, Choice, DevCatalog, CatalogRow } from '../src/inventory-shadow/types'
import { productCatalog, catalogDoorStyles, doorLineChoices, finishesForStyle, finishTypesForDoorLine, doorStyleSupportsGlass } from '../src/data/productCatalog'
import { finishes, glassOptions } from '../src/data/options'
import { hardwareOptions, hardwareCardAssetUrl, hardwareAssetUrl, allHardwareAssets, hardwarePreviewAssetUrl } from '../src/data/hardware'
import { cladColors } from '../src/data/finishes'
import { isCustomerSelectableGlass } from '../src/data/customerGlassAvailability'
import { sideliteAssetFamilyForSlab, sideliteStylesForFamily, sideliteSlabAsset, sideliteGlassMask } from '../src/data/sideliteAssets'
import { resolveDoorPreviewCandidates } from '../src/data/doorPreviewAssets'
import { resolveGlassMaskAsset } from '../src/data/glassMaskAssets'
import * as FSL from '../src/data/fslGlass'
import * as F48 from '../src/data/f48slGlass'
import * as SSL from '../src/data/sslGlass'
import { s2slGlassOptions, s2slStyleRules } from '../src/data/s2slGlass'
import { cr14slGlassOptions, cr14slStyleRules } from '../src/data/cr14slGlass'
import { appInventory } from '../scripts/inventory/source'
import type { GridColor, GridPattern } from '../src/types'

let app:ReturnType<typeof appInventory>|undefined
const inline=()=>app??(app=appInventory())
const choice=(id:string,metadata:Record<string,unknown>):Choice=>({id,metadata})
const unique=(rows:Choice[])=>[...new Map(rows.map(row=>[row.id,row])).values()]
const notes=(row:CatalogRow)=>JSON.parse(row.notes as string||'{}')
const sourceGlass=(slab:string)=>({fsl:FSL.fslGlassOptions,f48sl:F48.f48slGlassOptions,ssl:SSL.sslGlassOptions,s2sl:s2slGlassOptions,cr14sl:cr14slGlassOptions}[slab]||[])
const assetChoice=(role:string,view:string,order:number,path:string)=>choice(`${role}:${view}:${order}:${path}`,{path,role,view,order})
const hardwareMetadata=(manufacturer:string,style:string,finish:string,color:string,type:string,crop:unknown)=>({manufacturer,style,finish,color,type,crop})
export function hardcodedSnapshot(c:ShadowContext):Snapshot {
  const a=inline(),style=catalogDoorStyles.find(s=>s.id===c.styleId),group=doorLineChoices.find(g=>g.id===c.lineId)
  const variants=style?.variants.filter(v=>group?.lineIds.includes(v.lineId)&&(!c.grain||v.grains.includes(c.grain)||!v.grains.length))||[]
  const availableFinishes=style&&group&&(group.id!=='signature-series'||c.grain)?finishesForStyle({...style,variants},finishes,group.id,c.grain):[]
  const availableTypes=style&&group?finishTypesForDoorLine(style,group.id):[]
  const codes=style?.variants.filter(v=>group?.lineIds.includes(v.lineId)).map(v=>v.code)||[]
  const main=style&&group&&doorStyleSupportsGlass(style,group.id)?glassOptions.filter(o=>codes.some(code=>o.overlaysByDoorStyle[code])&&!(codes.includes('F')&&a.legacyFullLiteGlassIds.has(o.id))&&!(codes.includes('S')&&a.legacySHalfLiteClearGlassIds.has(o.id))&&!(codes.some(code=>['F48','F482'].includes(code))&&a.legacyF48ClearGlassIds.has(o.id))&&(!codes.some(code=>['F48','F482'].includes(code))||a.f48GlassOptionIds.has(o.id))&&!(codes.includes('SAT')&&a.glassCategory(o)==='privacy')&&isCustomerSelectableGlass(o)):[]
  const family=sideliteAssetFamilyForSlab({doorLineId:group?.id,grain:c.grain}),sides=sideliteStylesForFamily(family)
  const relevantSide=sides.includes(c.sideliteStyle as never)?c.sideliteStyle!:''
  const visibleFinishes=availableFinishes.filter(f=>!c.finishType||f.finishType===c.finishType)
  const families=codes.some(code=>['3LT','3STEP','4LT','5LT','F764'].includes(code))?[a.retroGlassCategory]:a.glassCategoryChoices.filter((family:{id:string})=>main.some(g=>a.glassCategory(g)===family.id))
  const results:Snapshot={
    doorLineChoices:{choices:style?doorLineChoices.filter(g=>style.variants.some(v=>g.lineIds.includes(v.lineId))).map(g=>choice(g.id,{name:g.name,image:g.image,lineIds:[...g.lineIds].sort(),paintOnly:g.paintOnly??false,autoGrain:g.autoGrain??null})):[]},
    stylesForMaterial:{choices:catalogDoorStyles.filter(s=>!group||s.variants.some(v=>group.lineIds.includes(v.lineId)&&(!c.grain||v.grains.includes(c.grain)||!v.grains.length))).map(s=>choice(s.id,{name:s.name,code:s.code}))},
    finishTypes:{choices:availableTypes.map(id=>choice(id,{})),defaultId:availableTypes[0]},
    finishes:{choices:visibleFinishes.map(f=>choice(f.id,{name:f.name,color:f.color,type:f.finishType,proMatch:f.proMatch})),defaultId:visibleFinishes[0]?.id},
    mainGlass:{choices:unique(main.map(g=>choice(g.id,{name:g.name,family:a.glassCategory(g),renderable:true})))},
    mainGlassFamilies:{choices:families.map((f:{id:string;name:string})=>choice(f.id,{name:f.name})),defaultId:families[0]?.id},
    sideliteStyles:{choices:sides.map(id=>choice(id,{name:a.sideliteStyleOptions.find((s:{id:string})=>s.id===id).name,family}))},
    sideliteGlass:{choices:unique(sourceGlass(relevantSide).filter(isCustomerSelectableGlass).map(g=>choice(`${relevantSide}:${g.id}`,{name:g.name,family:g.category,renderable:true})))},
    hardwareBrands:{choices:[...new Set(hardwareOptions.map(h=>h.manufacturer))].map(id=>choice(id,{name:id}))},
    hardwareStyles:{choices:unique(hardwareOptions.map(h=>choice(`${h.manufacturer}:${h.style}`,{manufacturer:h.manufacturer,name:h.style,defaultHardwareId:hardwareOptions.find(option=>option.manufacturer===h.manufacturer&&option.style===h.style)!.id})))},
    hardwareProducts:{choices:hardwareOptions.map(h=>choice(h.id,hardwareMetadata(h.manufacturer,h.style,h.finish,h.color,h.type,h.crop)))},
    frameMaterials:{choices:['timber','clad'].map(id=>choice(id,{name:id==='timber'?'Timber':'Clad',kind:id,selectable:false}))},
    frameFinishes:{choices:finishes.flatMap(f=>[choice(`timber:${f.id}`,{color:f.color,type:f.finishType}),...(cladColors.some(color=>`paint-${color.id}`===f.id)?[choice(`clad:${f.id}`,{color:f.color,type:f.finishType})]:[])])},
    historicalGlass:{choices:c.glassId?unique(glassOptions.filter(g=>g.id===c.glassId).map(g=>choice(g.id,{name:g.name,renderable:true,selectable:isCustomerSelectableGlass(g)&&main.some(m=>m.id===g.id),occurrences:glassOptions.filter(o=>o.id===g.id).length}))):[]},
    gridCombinations:{choices:[]},gridAssets:{choices:[]},assetBindings:{choices:[]},
  }
  const assets:Choice[]=[]
  const addAsset=(role:string,view:string,order:number,path?:string|null)=>{if(path)assets.push(assetChoice(role,view,order,path))}
  if(style&&group)for(const variant of variants){
    const subset={...style,variants:[variant]},line=productCatalog.find(l=>l.id===variant.lineId)!,grain=line.grains[0]
    addAsset('door:thumbnail','',0,style.image);addAsset('door:mask',variant.code,0,resolveGlassMaskAsset(variant.code))
    for(const kind of ['paint','stain'] as const)if(finishesForStyle(subset,finishes,group.id,grain).some(f=>f.finishType===kind))resolveDoorPreviewCandidates(subset,kind,{doorTypeLabel:'Door Line',doorType:line.name,doorTypes:[line.name],matchingVariants:[variant],styleCodes:[variant.code]},grain).forEach((path,i)=>addAsset('door:slab_render',kind,i,path))
    const glass=glassOptions.find(g=>g.id===c.glassId)
    if(glass?.overlaysByDoorStyle[variant.code]){addAsset('glass:thumbnail','',0,glass.thumbnailPath);addAsset('glass:glass_overlay',variant.code,0,glass.overlaysByDoorStyle[variant.code]);addAsset('glass:mask',variant.code,0,resolveGlassMaskAsset(variant.code))}
  }
  if(relevantSide){addAsset('sidelite:slab_render','',0,sideliteSlabAsset(family,relevantSide as never));addAsset('sidelite:mask','',0,sideliteGlassMask(family,relevantSide as never))}
  const hardware=hardwareOptions.find(h=>h.id===c.hardwareId)
  for(const finish of visibleFinishes)addAsset(`finish:${finish.id}:finish_swatch`,'',0,finish.image)
  if(hardware){addAsset('hardware:hardware_card','',0,hardwareCardAssetUrl(hardware));for(const authored of allHardwareAssets.filter(h=>h.manufacturer===hardware.manufacturer&&h.style===hardware.style&&h.finish===hardware.finish))addAsset(`hardware:${authored.view==='Exterior'?'exterior_hardware':'interior_hardware'}`,`authored:${authored.view}:${authored.handing}`,0,hardwareAssetUrl(authored.asset));for(const swing of a.doorSwingOptions)for(const view of ['Exterior','Interior'] as const)addAsset(`hardware:${view==='Exterior'?'exterior_hardware':'interior_hardware'}`,`preview:${view}:${swing.id}`,0,hardwarePreviewAssetUrl(hardware,view,swing))}
  results.assetBindings.choices=unique(assets)
  results.gridCombinations.choices=nativeGrids(codes,relevantSide)
  results.gridAssets.choices=results.gridCombinations.choices.map(row=>choice(row.id,{paths:row.metadata.path?[row.metadata.path]:[]}))
  return results
}

export function databaseSnapshot(catalog:DevCatalog,c:ShadowContext):Snapshot {
  const t=(name:string)=>catalog.tables[name]||[],byId=new Map(Object.values(catalog.tables).flat().map(row=>[row.id,row]))
  const name=(id:unknown)=>byId.get(id as string)?.display_name as string
  const legacy=(id:unknown)=>byId.get(id as string)?.legacy_id as string
  const group=t('door_line_groups').find(g=>g.legacy_id===c.lineId),lineIds=new Set(t('door_line_group_members').filter(m=>m.door_line_group_id===group?.id).map(m=>m.door_line_id))
  const style=t('door_styles').find(s=>s.legacy_id===c.styleId)
  const variants=t('door_variants').filter(v=>v.door_style_id===style?.id&&lineIds.has(v.door_line_id)&&(!c.grain||!v.grain_id||legacy(v.grain_id)===c.grain))
  const variantIds=new Set(variants.map(v=>v.id)),allStyleVariants=t('door_variants').filter(v=>v.door_style_id===style?.id)
  const finishIds=new Set(t('door_variant_finishes').filter(r=>variantIds.has(r.door_variant_id as string)&&r.customer_selectable).map(r=>r.finish_id))
  const allowed=t('finishes').filter(f=>finishIds.has(f.id)).sort(order)
  const visible=group&&(group.legacy_id!=='signature-series'||c.grain)?allowed.filter(f=>!c.finishType||f.finish_type===c.finishType):[]
  const glassIds=new Set(t('door_variant_glass_options').filter(r=>variantIds.has(r.door_variant_id as string)&&r.customer_selectable).map(r=>r.glass_option_id)),main=t('glass_options').filter(g=>glassIds.has(g.id)&&g.customer_selectable)
  const sideIds=new Set(t('door_variant_sidelites').filter(r=>variantIds.has(r.door_variant_id as string)&&r.customer_selectable).map(r=>r.sidelite_variant_id)),sides=group?.legacy_id==='signature-series'&&!c.grain?[]:t('sidelite_variants').filter(s=>sideIds.has(s.id))
  const chosenSides=sides.filter(s=>legacy(s.sidelite_style_id)===c.sideliteStyle)
  const sideGlassIds=new Set(t('sidelite_variant_glass_options').filter(r=>chosenSides.some(s=>s.id===r.sidelite_variant_id)&&r.customer_selectable).map(r=>r.glass_option_id))
  const family=(g:CatalogRow)=>legacy(byId.get(g.glass_design_id as string)?.glass_family_id)
  const reachableGroups=t('door_line_groups').filter(g=>t('door_line_group_members').some(m=>m.door_line_group_id===g.id&&allStyleVariants.some(v=>v.door_line_id===m.door_line_id)))
  const selectedGlass=t('glass_options').filter(g=>g.scope==='door'&&g.legacy_id===c.glassId)
  const familyIds=new Set(main.map(g=>family(g)))
  const families=variants.some(v=>['3LT','3STEP','4LT','5LT','F764'].includes(v.opening_code as string))?t('glass_families').filter(f=>f.legacy_id==='retro'):t('glass_families').filter(f=>familyIds.has(f.legacy_id!)).sort(order)
  const availableTypes=[...new Set(allowed.map(f=>f.finish_type as string))]
  const snapshot:Snapshot={
    doorLineChoices:{choices:reachableGroups.map(g=>{const source=notes(g).source;return choice(g.legacy_id!,{name:g.display_name,image:source.image,lineIds:t('door_line_group_members').filter(m=>m.door_line_group_id===g.id).map(m=>legacy(m.door_line_id)).sort(),paintOnly:source.paintOnly??false,autoGrain:source.autoGrain??null})})},
    stylesForMaterial:{choices:t('door_styles').filter(s=>!group||t('door_variants').some(v=>v.door_style_id===s.id&&lineIds.has(v.door_line_id)&&(!c.grain||!v.grain_id||legacy(v.grain_id)===c.grain))).map(s=>choice(s.legacy_id!,{name:s.display_name,code:s.product_code}))},
    finishTypes:{choices:availableTypes.map(id=>choice(id,{})),defaultId:availableTypes[0]},
    finishes:{choices:visible.map(f=>choice(f.legacy_id!,{name:f.display_name,color:f.hex_color,type:f.finish_type,proMatch:notes(f).source.proMatch})),defaultId:visible[0]?.legacy_id},
    mainGlass:{choices:unique(main.map(g=>choice(g.legacy_id!,{name:g.display_name,family:family(g),renderable:g.renderable})))},
    mainGlassFamilies:{choices:families.map(f=>choice(f.legacy_id!,{name:f.display_name})),defaultId:families[0]?.legacy_id},
    sideliteStyles:{choices:unique(sides.map(s=>choice(legacy(s.sidelite_style_id),{name:name(s.sidelite_style_id),family:s.asset_family_alias})))},
    sideliteGlass:{choices:t('glass_options').filter(g=>sideGlassIds.has(g.id)&&g.customer_selectable).map(g=>choice(`${c.sideliteStyle}:${g.legacy_id}`,{name:g.display_name,family:family(g),renderable:g.renderable}))},
    hardwareBrands:{choices:t('hardware_brands').filter(r=>r.customer_selectable).map(r=>choice(r.legacy_id!,{name:r.display_name}))},
    hardwareStyles:{choices:t('hardware_styles').filter(r=>r.customer_selectable).map(r=>choice(r.legacy_id!,{manufacturer:name(r.hardware_brand_id),name:r.display_name,defaultHardwareId:t('hardware_variants').filter(v=>v.hardware_style_id===r.id&&v.customer_selectable).sort(order)[0]?.legacy_id}))},
    hardwareProducts:{choices:t('hardware_variants').filter(r=>r.customer_selectable).map(r=>{const styleRow=byId.get(r.hardware_style_id as string)!,finish=byId.get(r.hardware_finish_id as string)!,meta=notes(r);return choice(r.legacy_id!,hardwareMetadata(name(styleRow.hardware_brand_id),styleRow.display_name!,finish.display_name!,finish.hex_color as string,meta.functionalType,meta.knobOnlyCrop))})},
    frameMaterials:{choices:t('frame_materials').map(r=>choice(r.legacy_id!,{name:r.display_name,kind:r.frame_kind,selectable:r.customer_selectable}))},
    frameFinishes:{choices:t('frame_material_finishes').map(r=>{const finish=byId.get(r.finish_id as string)!;return choice(`${legacy(r.frame_material_id)}:${finish.legacy_id}`,{color:finish.hex_color,type:finish.finish_type})})},
    historicalGlass:{choices:unique(selectedGlass.map(g=>choice(g.legacy_id!,{name:g.display_name,renderable:g.renderable,selectable:main.some(m=>m.legacy_id===g.legacy_id),occurrences:notes(g).sourceRowPositions.length})))},
    gridCombinations:{choices:[]},gridAssets:{choices:[]},assetBindings:{choices:[]},
  }
  const assets:Choice[]=[]
  function bindings(table:string,column:string,parents:Set<string>,prefix:string){for(const r of t(table).filter(row=>parents.has(row[column] as string))){const path=byId.get(r.asset_id as string)?.current_path;if(typeof path!=='string')throw new Error('Unresolved inventory asset binding');assets.push(assetChoice(`${prefix}:${r.role}`,r.view_key as string||'',r.display_order||0,path))}}
  bindings('door_variant_assets','door_variant_id',variantIds,'door')
  bindings('glass_option_assets','glass_option_id',new Set(selectedGlass.filter(g=>variants.some(v=>v.opening_code===g.opening_code)).map(g=>g.id)),'glass')
  bindings('sidelite_variant_assets','sidelite_variant_id',new Set(chosenSides.map(s=>s.id)),'sidelite')
  bindings('hardware_variant_assets','hardware_variant_id',new Set(t('hardware_variants').filter(h=>h.legacy_id===c.hardwareId).map(h=>h.id)),'hardware')
  for(const finish of visible)bindings('finish_assets','finish_id',new Set([finish.id]),`finish:${finish.legacy_id}`)
  snapshot.assetBindings.choices=unique(assets)
  const relevantGlass=new Set([...main.map(g=>g.id),...t('glass_options').filter(g=>sideGlassIds.has(g.id)).map(g=>g.id)])
  for(const row of t('allowed_grid_combinations').filter(r=>relevantGlass.has(r.glass_option_id as string)&&r.customer_selectable)){
    const glass=byId.get(row.glass_option_id as string)!
    for(const context of notes(row).contexts){const pattern=legacy(row.grid_pattern_id)==='__no_pattern_selection__'?null:legacy(row.grid_pattern_id);const scope=glass.scope==='door'?glass.opening_code:c.sideliteStyle;const tuple={scope,glass:glass.legacy_id,location:context.location,profile:legacy(row.grid_profile_id),pattern,color:legacy(row.grid_color_id),width:row.width_selection_mode==='none'?null:legacy(row.grid_width_id),coating:legacy(row.glass_coating_id),path:context.path};snapshot.gridCombinations.choices.push(choice(gridKey(tuple),tuple));snapshot.gridAssets.choices.push(choice(gridKey(tuple),{paths:t('grid_combination_assets').filter(binding=>binding.grid_combination_id===row.id&&binding.view_key===context.location).map(binding=>byId.get(binding.asset_id as string)?.current_path).sort()}))}
  }
  snapshot.gridCombinations.choices=unique(snapshot.gridCombinations.choices)
  return snapshot
}
function order(a:CatalogRow,b:CatalogRow){return (a.display_order||0)-(b.display_order||0)}
function gridKey(tuple:Record<string,unknown>){return JSON.stringify(Object.entries(tuple).filter(([key])=>key!=='path'))}

/** Independently enumerate the current UI's scoped rule dictionaries, not exporter rows. */
function nativeGrids(codes:string[],slab:string):Choice[]{
  const a=inline(),result:Choice[]=[]
  const emit=(scope:string,glass:string,location:string,profile:string,pattern:string|null,color:string,width:string|null,coating:string,path?:string|null)=>{const tuple={scope,glass,location,profile,pattern,color,width,coating,path:path??null};result.push(choice(gridKey(tuple),tuple))}
  function union(scope:string,glass:string,standard:Record<string,Record<string,Record<string,string[]>>>,low:typeof standard,path:(profile:string,pattern:string,color:string)=>string|null){
    for(const profile of new Set([...Object.keys(standard),...Object.keys(low)]))for(const pattern of new Set([...Object.keys(standard[profile]||{}),...Object.keys(low[profile]||{})]))for(const color of new Set([...Object.keys(standard[profile]?.[pattern]||{}),...Object.keys(low[profile]?.[pattern]||{})])){
      const s=standard[profile]?.[pattern]?.[color],l=low[profile]?.[pattern]?.[color]
      const widths=[...new Set([...(s||[]),...(l||[])])];if(s?.length===0||l?.length===0)widths.push('')
      for(const width of widths){const match=(values:string[]|undefined)=>values!==undefined&&(width?values.includes(width):values.length===0);emit(scope,glass,'internal',profile,pattern==='none'?null:pattern,color,width||null,match(s)&&match(l)?'Standard / No Low-E or Low-E':match(l)?'Low-E':'Standard / No Low-E',path(profile,pattern,color))}
    }
  }
  for(const code of new Set(codes.filter(code=>['F','F48','F482','S'].includes(code)))){
    const prefix=code==='S'?'s':code==='F'?'':'f48',glass=code==='S'?'s-clear-grids':code==='F'?'f-clear-grids':'f48-clear-grids'
    const s={Flat:a[prefix?`${prefix}StandardFlatRules`:'flatGridRules'],Contoured:prefix?a[`${prefix}StandardContouredRules`]:{'15 Lite':{Champagne:['11/16"']}},Prairie:{none:a[prefix?`${prefix}StandardPrairieRules`:'prairieGridRules']}}
    const l={Flat:a[prefix?`${prefix}LowEFlatRules`:'lowEFlatGridRules'],Contoured:a[prefix?`${prefix}LowEContouredRules`:'lowEContouredRules'],'Arts & Crafts':a.lowEArtsRules,Prairie:{none:a[prefix?`${prefix}LowEPrairieRules`:'lowEPrairieGridRules']}}
    const path=(profile:string,pattern:string,color:string)=>profile==='Prairie'?a.prairieGridAssets[color]||null:profile==='Arts & Crafts'?`/assets/hgi-assets/Glass/F/INTERNAL GRIDS/FART${a.internalGridPatternCodes[pattern]}WH.webp`:code==='S'?a.sInternalGridAsset(pattern,color):prefix?a.f48InternalGridAsset(pattern,color):profile==='Contoured'?a.contouredGridAssets[pattern]?.[color]||null:a.internalGridAsset(pattern,color)
    union(code,glass,s,l,path)
    for(const location of ['external','sdl']){if(prefix==='f48'&&location==='external')continue;const patterns=location==='external'?(code==='S'?['4 Lite','9 Lite']:['8 Lite','10 Lite','15 Lite']):(code==='S'?['9 Lite']:prefix==='f48'?['4 Lite']:['6 Lite','8 Lite','15 Lite']);for(const pattern of patterns)emit(code,glass,location,'Flat',pattern,'White',null,location==='sdl'?'Low-E':code==='S'?pattern==='4 Lite'?'Standard / No Low-E or Low-E':'Low-E':pattern==='8 Lite'?'Standard / No Low-E, Low-E or Low-E Plus':'Low-E or Low-E Plus',path('Flat',pattern,'White'))}
  }
  const catalog=slab==='fsl'?{s:FSL.fslStandardStyleRules,l:FSL.fslLowEStyleRules,grid:FSL.fslGridAsset,prairie:FSL.fslPrairieGridAsset,arts:FSL.fslArtsAndCraftsGridAsset,sdl:['3 Lite','4 Lite','5 Lite']}:slab==='f48sl'?{s:F48.f48slStandardStyleRules,l:F48.f48slLowEStyleRules,grid:F48.f48slGridAsset,prairie:F48.f48slPrairieGridAsset,arts:F48.f48slArtsAndCraftsGridAsset,sdl:['2 Lite','3 Lite','4 Lite']}:slab==='ssl'?{s:SSL.sslStandardStyleRules,l:SSL.sslLowEStyleRules,grid:SSL.sslGridAsset,prairie:SSL.sslPrairieGridAsset,arts:SSL.sslArtsAndCraftsGridAsset,sdl:['3 Lite']}:null
  if(catalog){const path=(profile:string,pattern:string,color:string)=>profile==='Prairie'?catalog.prairie(color as GridColor):profile==='Arts & Crafts'?catalog.arts(color as GridColor):catalog.grid(pattern as GridPattern,color as GridColor);union(slab,'clear-grids',catalog.s,catalog.l,path);for(const pattern of catalog.sdl)emit(slab,'clear-grids','sdl','Flat',pattern,'Bronze',null,'Standard / No Low-E or Low-E',catalog.grid(pattern as GridPattern,'Bronze'))}
  return unique(result)
}
