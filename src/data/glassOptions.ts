import type { GlassOption } from '../types'

const glassThumbnailOptions = [
  { id: 'ashbury', name: 'Ashbury', image: '/assets/glass/ASHBURY.jpg' },
  { id: 'bay-point', name: 'Bay Point', image: '/assets/glass/BAYPOINT.jpg' },
  { id: 'berkley', name: 'Berkley', image: '/assets/glass/BERKLEY.jpg' },
  { id: 'blanca', name: 'Blanca', image: '/assets/glass/BLANCA.jpg' },
  { id: 'blinds', name: 'Blinds', image: '/assets/glass/Blinds.png' },
  { id: 'bristol', name: 'Bristol', image: '/assets/glass/Bristol.png' },
  { id: 'cadence', name: 'Cadence', image: '/assets/glass/Cadence.png' },
  { id: 'calandra', name: 'Calandra', image: '/assets/glass/CALANDRA.jpg' },
  { id: 'carrollton', name: 'Carrollton', image: '/assets/glass/CARROLLTON.jpg' },
  { id: 'catalina', name: 'Catalina', image: '/assets/glass/CATALINA.jpg' },
  { id: 'chinchilla', name: 'Chinchilla', image: '/assets/glass/Chinchilla.png' },
  { id: 'clear', name: 'Clear', image: '/assets/glass/Clear.png' },
  { id: 'clic', name: 'CLIC', image: '/assets/glass/CLIC.png' },
  { id: 'cobblestone', name: 'Cobblestone', image: '/assets/glass/Cobblestone.png' },
  { id: 'contg', name: 'CONTG', image: '/assets/glass/CONTG.png' },
  { id: 'crosswalk', name: 'Crosswalk', image: '/assets/glass/CROSSWALK.jpg' },
  { id: 'cumulus', name: 'Cumulus', image: '/assets/glass/Cumulus.png' },
  { id: 'decorative', name: 'Decorative', image: '/assets/glass/Decorative.png' },
  { id: 'dorian', name: 'Dorian', image: '/assets/glass/DORIAN.png' },
  { id: 'dutchcraft', name: 'Dutchcraft', image: '/assets/glass/Dutchcraft.png' },
  { id: 'edgewood', name: 'Edgewood', image: '/assets/glass/EDGEWOOD.jpg' },
  { id: 'elegant', name: 'Elegant', image: '/assets/glass/ELEGANT.jpg' },
  { id: 'empire', name: 'Empire', image: '/assets/glass/EMPIRE.jpg' },
  { id: 'entropy', name: 'Entropy', image: '/assets/glass/Entropy.png' },
  { id: 'extg', name: 'EXTG', image: '/assets/glass/EXTG.png' },
  { id: 'flatg', name: 'FLATG', image: '/assets/glass/FLATG.png' },
  { id: 'geneva', name: 'Geneva', image: '/assets/glass/GENEVA.jpg' },
  { id: 'grace', name: 'Grace', image: '/assets/glass/Grace.png' },
  { id: 'heirlooms', name: 'Heirlooms', image: '/assets/glass/Heirlooms.png' },
  { id: 'high-point', name: 'High Point', image: '/assets/glass/HIGH POINT.jpg' },
  { id: 'jacinto', name: 'Jacinto', image: '/assets/glass/JACINTO.jpg' },
  { id: 'jameston', name: 'Jameston', image: '/assets/glass/JAMESTON.jpg' },
  { id: 'laurel', name: 'Laurel', image: '/assets/glass/LAUREL.jpg' },
  { id: 'lazarus', name: 'Lazarus', image: '/assets/glass/Lazarus.png' },
  { id: 'leland', name: 'Leland', image: '/assets/glass/Leland.png' },
  { id: 'lexington', name: 'Lexington', image: '/assets/glass/Lexington.png' },
  { id: 'linen', name: 'Linen', image: '/assets/glass/Linen.png' },
  { id: 'london', name: 'London', image: '/assets/glass/LONDON.jpg' },
  { id: 'low-e', name: 'Low-E', image: '/assets/glass/LowE.png' },
  { id: 'low-e-plus', name: 'Low-E+', image: '/assets/glass/LowE+.png' },
  { id: 'low-e-366', name: 'Low-E 366', image: '/assets/glass/LowE366.png' },
  { id: 'majestic', name: 'Majestic', image: '/assets/glass/Majestic.png' },
  { id: 'margate', name: 'Margate', image: '/assets/glass/MARGATE.jpg' },
  { id: 'metro', name: 'Metro', image: '/assets/glass/METRO.jpg' },
  { id: 'micro-granite', name: 'Micro Granite', image: '/assets/glass/MicroGranite.png' },
  { id: 'mistify', name: 'Mistify', image: '/assets/glass/Mistify.png' },
  { id: 'mohave', name: 'Mohave', image: '/assets/glass/Mohave.png' },
  { id: 'monterey', name: 'Monterey', image: '/assets/glass/MONTEREY.jpg' },
  { id: 'neo', name: 'Neo', image: '/assets/glass/NEO.jpg' },
  { id: 'nouveau', name: 'Nouveau', image: '/assets/glass/Nouveau.png' },
  { id: 'oak-park', name: 'Oak Park', image: '/assets/glass/Oak Park.png' },
  { id: 'ocean-caming', name: 'Ocean Caming', image: '/assets/glass/Ocean Caming.png' },
  { id: 'ovation', name: 'Ovation', image: '/assets/glass/Ovation.png' },
  { id: 'pembrook', name: 'Pembrook', image: '/assets/glass/PEMBROOK.jpg' },
  { id: 'prestige', name: 'Prestige', image: '/assets/glass/PRESTIGE.jpg' },
  { id: 'privacy', name: 'Privacy', image: '/assets/glass/Privacy.png' },
  { id: 'rain', name: 'Rain', image: '/assets/glass/Rain.png' },
  { id: 'renewed-impressions', name: 'Renewed Impressions', image: '/assets/glass/Renewed Impressions.png' },
  { id: 'retro', name: 'Retro', image: '/assets/glass/Retro.png' },
  { id: 'riverwood', name: 'Riverwood', image: '/assets/glass/RIVERWOOD.jpg' },
  { id: 'steamed', name: 'Steamed', image: '/assets/glass/STEAMED.jpg' },
  { id: 'sterling', name: 'Sterling', image: '/assets/glass/Sterling.png' },
  { id: 'topaz', name: 'Topaz', image: '/assets/glass/Topaz.png' },
  { id: 'vapor', name: 'Vapor', image: '/assets/glass/Vapor.png' },
  { id: 'vilano', name: 'Vilano', image: '/assets/glass/VILANO.jpg' },
  { id: 'vincraft', name: 'Vincraft', image: '/assets/glass/VINCRAFT.jpg' },
  { id: 'waterside', name: 'Waterside', image: '/assets/glass/WATERSIDE.jpg' },
  { id: 'wyngate', name: 'Wyngate', image: '/assets/glass/WYNGATE.jpg' },
]

const cr14Overlays: Record<string, string> = {
  'bay-point': 'CR14BAY.png',
  blanca: 'CR14BLA.png',
  celestial: 'CR14CEL.png',
  chinchilla: 'CR14CHI.png',
  cobblestone: 'CR14COB.png',
  courtyard: 'CR14COU.png',
  crosswalk: 'CR14CRO.png',
  cumulus: 'CR14CUM.png',
  'dorian-nickel': 'CR14DORNI.png',
  'dorian-patina': 'CR14DORPA.png',
  dutchcraft: 'CR14DUT.png',
  edgewood: 'CR14EDG.png',
  laurel: 'CR14LAU.png',
  leland: 'CR14LEL.png',
  linen: 'CR14LIN.png',
  margate: 'CR14MAR.png',
  'micro-granite': 'CR14MIC.png',
  mistify: 'CR14MIS.png',
  'monterey-nickel': 'CR14MONNI.png',
  'monterey-patina': 'CR14MONPA.png',
  'oak-park': 'CR14OAK.png',
  paris: 'CR14PAR.png',
  pembrook: 'CR14PEM.png',
  rain: 'CR14RAI.png',
  riverwood: 'CR14RIV.png',
  sterling: 'CR14STR.png',
  topaz: 'CR14TOP.png',
  vapor: 'CR14VAP.png',
  vilano: 'CR14VIL.png',
  vincraft: 'CR14VIN.png',
  wyngate: 'CR14WYN.png',
}

const f848Overlays: Record<string, string> = {
  berkley: 'F848BER.png',
  blanca: 'F848BLA.png',
  cadence: 'F848CAD.png',
  calandra: 'F848CAL.png',
  carrollton: 'F848CAR.png',
  chinchilla: 'F848CHI.png',
  courtyard: 'F848COU.png',
  crosswalk: 'F848CRO.png',
  cumulus: 'F848CUM.png',
  'dorian-nickel': 'F848DORNI.png',
  'dorian-patina': 'F848DORPA.png',
  'elegant-black-white': 'F848ELEBW.png',
  'elegant-nickel': 'F848ELENI.png',
  'elegant-patina': 'F848ELEPA.png',
  empire: 'F848EMP.png',
  clear: 'F848F10.png',
  geneva: 'F848GEN.png',
  'grace-patina': 'F848GRAPA.png',
  'heirlooms-brass': 'F848HEIBB.png',
  'heirlooms-nickel': 'F848HEINI.png',
  'high-point': 'F848HIG.png',
  jacinto: 'F848JAC.png',
  linen: 'F848LIN.png',
  'majestic-nickel': 'F848MAJNI.png',
  margate: 'F848MAR.png',
  metro: 'F848MET.png',
  'micro-granite': 'F848MIC.png',
  mistify: 'F848MIS.png',
  'monterey-patina': 'F848MONPA.png',
  neo: 'F848NEO.png',
  'nouveau-nickel': 'F848NOUNI.png',
  'nouveau-patina': 'F848NOUPA.png',
  'oak-park': 'F848OAK.png',
  paris: 'F848PAR.png',
  prestige: 'F848PRE.png',
  rain: 'F848RAI.png',
  topaz: 'F848TOP.png',
  vapor: 'F848VAP.png',
  vilano: 'F848VIL.png',
  waterside: 'F848WAT.png',
}

const foOverlays: Record<string, string> = {
  cadence: 'FOCAD.png',
  clear: 'FOFOCL.png',
  'grace-nickel': 'FOGRANI.png',
  'grace-patina': 'FOGRAPA.png',
  'heirlooms-brass': 'FOHEIBB.png',
  'heirlooms-nickel': 'FOHEINI.png',
  'nouveau-nickel': 'FONOUNI.png',
  'nouveau-patina': 'FONOUPA.png',
}

const qaOverlays: Record<string, string> = {
  clear: 'QAQACL.png',
  'grace-nickel': 'QAGRANI.png',
  'grace-patina': 'QAGRAPA.png',
  london: 'QALON.png',
  'nouveau-nickel': 'QANOUNI.png',
  'nouveau-patina': 'QANOUPA.png',
  pembrook: 'QAPEM.png',
  riverwood: 'QARIV.png',
  vincraft: 'QAVIN.png',
  wyngate: 'QAWYN.png',
}

const s836Overlays: Record<string, string> = {
  berkley: 'S836BER.png',
  blanca: 'S836BLA.png',
  chinchilla: 'S836CHI.png',
  crosswalk: 'S836CRO.png',
  courtyard: 'S836COU.png',
  cumulus: 'S836CUM.png',
  'dorian-nickel': 'S836DORNI.png',
  'dorian-patina': 'S836DORPA.png',
  'elegant-black-white': 'S836ELEBW.png',
  'elegant-nickel': 'S836ELEPN.png',
  'elegant-patina': 'S836ELEPA.png',
  empire: 'S836EMP.png',
  clear: 'S836F10.png',
  'grace-nickel': 'S836GRA.png',
  blinds: 'S836H8RLB.png',
  'heirlooms-brass': 'S836HEIBB.png',
  'heirlooms-nickel': 'S836HEINI.png',
  lazarus: 'S836LAS.png',
  linen: 'S836LIN.png',
  'majestic-patina': 'S836MAJPA.png',
  margate: 'S836MAR.png',
  metro: 'S836MET.png',
  'micro-granite': 'S836MIC.png',
  mohave: 'S836MOH.png',
  neo: 'S836NEO.png',
  'nouveau-nickel': 'S836NOUNI.png',
  'nouveau-patina': 'S836NOUPA.png',
  paris: 'S836PAR.png',
  prestige: 'S836PRE.png',
  rain: 'S836RAI.png',
  'renewed-impressions': 'S836REN.png',
  topaz: 'S836TOP.png',
  vapor: 'S836VAP.png',
  vilano: 'S836VIL.png',
  waterside: 'S836WAT.png',
}

const swOverlays: Record<string, string> = {
  clear: 'SWGWH.png',
  'grace-nickel': 'SWGRC.png',
  'grace-patina': 'SWGRAPA.png',
  'heirlooms-brass': 'SWHEIBB.png',
  'heirlooms-nickel': 'SWHEINI.png',
  'micro-granite': 'SWMIC.png',
  'nouveau-nickel': 'SWNOUNI.png',
  'nouveau-patina': 'SWNOUPA.png',
  'renewed-impressions': 'SWREN.png',
}

const variantThumbnailOptions = [
  { id: 'dorian-nickel', name: 'Dorian - Nickel', image: '/assets/glass/DORIAN.png' },
  { id: 'dorian-patina', name: 'Dorian - Patina', image: '/assets/glass/DORIAN.png' },
  { id: 'elegant-black-white', name: 'Elegant - Black/White', image: '/assets/glass/ELEGANT.jpg' },
  { id: 'elegant-nickel', name: 'Elegant - Nickel', image: '/assets/glass/ELEGANT.jpg' },
  { id: 'elegant-patina', name: 'Elegant - Patina', image: '/assets/glass/ELEGANT.jpg' },
  { id: 'grace-nickel', name: 'Grace - Nickel', image: '/assets/glass/Grace.png' },
  { id: 'grace-patina', name: 'Grace - Patina', image: '/assets/glass/Grace.png' },
  { id: 'heirlooms-brass', name: 'Heirlooms - Brass', image: '/assets/glass/Heirlooms.png' },
  { id: 'heirlooms-nickel', name: 'Heirlooms - Nickel', image: '/assets/glass/Heirlooms.png' },
  { id: 'majestic-nickel', name: 'Majestic - Nickel', image: '/assets/glass/Majestic.png' },
  { id: 'majestic-patina', name: 'Majestic - Patina', image: '/assets/glass/Majestic.png' },
  { id: 'monterey-nickel', name: 'Monterey - Nickel', image: '/assets/glass/MONTEREY.jpg' },
  { id: 'monterey-patina', name: 'Monterey - Patina', image: '/assets/glass/MONTEREY.jpg' },
  { id: 'nouveau-nickel', name: 'Nouveau - Nickel', image: '/assets/glass/Nouveau.png' },
  { id: 'nouveau-patina', name: 'Nouveau - Patina', image: '/assets/glass/Nouveau.png' },
  { id: 'celestial', name: 'Celestial', image: '/assets/glass/Ocean Caming.png' },
  { id: 'courtyard', name: 'Courtyard', image: '/assets/glass/Decorative.png' },
  { id: 'paris', name: 'Paris', image: '/assets/glass/Heirlooms.png' },
]

export const glassOptions: GlassOption[] = [
  ...glassThumbnailOptions.filter(
    ({ id }) => !['dorian', 'elegant', 'grace', 'heirlooms', 'majestic', 'monterey', 'nouveau'].includes(id),
  ),
  ...variantThumbnailOptions,
].map(({ image, ...option }) => {
  const overlaysByDoorStyle: Record<string, string> = {}
  const cr14Overlay = cr14Overlays[option.id]
  const f848Overlay = f848Overlays[option.id]
  const foOverlay = foOverlays[option.id]
  const qaOverlay = qaOverlays[option.id]
  const s836Overlay = s836Overlays[option.id]
  const swOverlay = swOverlays[option.id]

  if (cr14Overlay) {
    overlaysByDoorStyle.CR14 = `/assets/glass/overlays/CR14/${cr14Overlay}?v=3`
  }

  if (f848Overlay) {
    overlaysByDoorStyle.F848 = `/assets/glass/overlays/F848/${f848Overlay}?v=1`
  }

  if (foOverlay) {
    overlaysByDoorStyle.FO = `/assets/glass/overlays/FO/${foOverlay}?v=1`
  }

  if (qaOverlay) {
    overlaysByDoorStyle.QA = `/assets/glass/overlays/QA/${qaOverlay}?v=1`
  }

  if (s836Overlay) {
    overlaysByDoorStyle.S836 = `/assets/glass/overlays/S836/${s836Overlay}?v=1`
  }

  if (swOverlay) {
    overlaysByDoorStyle.SW = `/assets/glass/overlays/SW/${swOverlay}?v=1`
  }

  return {
    ...option,
    thumbnailPath: image.replace('/assets/glass/', '/assets/glass/thumbnails/'),
    overlaysByDoorStyle,
  }
})
