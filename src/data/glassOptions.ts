import type { GlassOption } from '../types'

const glassThumbnailOptions = [
  { id: 'ashbury', name: 'Ashbury', image: '/assets/glass/ASHBURY.jpg' },
  { id: 'bay-point', name: 'Bay Point', image: '/assets/glass/BAYPOINT.jpg' },
  { id: 'berkley', name: 'Berkley', image: '/assets/glass/BERKLEY.jpg' },
  { id: 'blanca', name: 'Blanca', image: '/assets/glass/BLANCA.jpg' },
  { id: 'blinds', name: 'Blinds', image: '/assets/glass/Blinds.png' },
  { id: 'briselle', name: 'Briselle', image: '/assets/glass/Decorative.png' },
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
  { id: 'cubed', name: 'Cubed', image: '/assets/glass/Decorative.png' },
  { id: 'cumulus', name: 'Cumulus', image: '/assets/glass/Cumulus.png' },
  { id: 'cyndi', name: 'Cyndi', image: '/assets/glass/Decorative.png' },
  { id: 'decorative', name: 'Decorative', image: '/assets/glass/Decorative.png' },
  { id: 'dorian', name: 'Dorian', image: '/assets/glass/DORIAN.png' },
  { id: 'dutchcraft', name: 'Dutchcraft', image: '/assets/glass/Dutchcraft.png' },
  { id: 'edgewood', name: 'Edgewood', image: '/assets/glass/EDGEWOOD.jpg' },
  { id: 'elegant', name: 'Elegant', image: '/assets/glass/ELEGANT.jpg' },
  { id: 'empire', name: 'Empire', image: '/assets/glass/EMPIRE.jpg' },
  { id: 'entropy', name: 'Entropy', image: '/assets/glass/Entropy.png' },
  { id: 'extg', name: 'EXTG', image: '/assets/glass/EXTG.png' },
  { id: 'flatg', name: 'FLATG', image: '/assets/glass/FLATG.png' },
  { id: 'fragrance', name: 'Fragrance', image: '/assets/glass/Decorative.png' },
  { id: 'frosted', name: 'Frosted', image: '/assets/glass/Privacy.png' },
  { id: 'garrison', name: 'Garrison', image: '/assets/glass/Decorative.png' },
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
  { id: 'rill', name: 'Rill', image: '/assets/glass/Decorative.png' },
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

const caOverlays: Record<string, string> = {
  'grace-nickel': 'CAGRANI.png',
  'grace-patina': 'CAGRAPA.png',
  'heirlooms-brass': 'CAHEIRBRA.png',
  'heirlooms-nickel': 'CAHEIRNI.png',
}

const threeLtOverlays: Record<string, string> = {
  chinchilla: '3LTCHIN.png',
  clear: '3LTCLEAR.png',
  'low-e': '3LTCLEARLE.png',
  cubed: '3LTCUBED.png',
  frosted: '3LTFROSTED.png',
  rain: '3LTRAIN.png',
}

const threeStepOverlays: Record<string, string> = {
  chinchilla: '3STEPCHINCHILLA.png',
  clear: '3STEPCLEAR.png',
  'low-e': '3STEPCLEARLE.png',
  cubed: '3STEPCUBED.png',
  frosted: '3STEPFROSTED.png',
  rain: '3STEPRAIN.png',
}

const fourLtOverlays: Record<string, string> = {
  chinchilla: '4LTCHINCHILLA.png',
  clear: '4LTCLEAR.png',
  'low-e': '4LTCLEARLE.png',
  cubed: '4LTCUBED.png',
  frosted: '4LTFROSTED.png',
  rain: '4LTRAIN.png',
}

const fiveLtOverlays: Record<string, string> = {
  chinchilla: '5LTCHINCHILLA.png',
  clear: '5LTCLEAR.png',
  'low-e': '5LTCLEARLE.png',
  cubed: '5LTCUBED.png',
  frosted: '5LTFROSTED.png',
  rain: '5LTRAIN.png',
}

const f2Overlays: Record<string, string> = {
  clear: 'F2Clear.png',
  frosted: 'F2Frosted.png',
}

const f3Overlays: Record<string, string> = {
  clear: 'F3Clear.png',
  frosted: 'F3Frosted.png',
}

const f4Overlays: Record<string, string> = {
  clear: 'F4Clear.png',
}

const f764Overlays: Record<string, string> = {
  chinchilla: 'F764Chinchilla.png',
  clear: 'F764Clear.png',
  'low-e': 'F764ClearLowE.png',
  cubed: 'F764Cubed.png',
  frosted: 'F764Frosted.png',
  rain: 'F764Rain.png',
}

const sOverlays: Record<string, string> = {
  berkley: 'SBER.png',
  blanca: 'SBLA.png',
  bristol: 'SBRI.png',
  chinchilla: 'SCHI.png',
  cobblestone: 'SCOB.png',
  courtyard: 'SCOU.png',
  crosswalk: 'SCRO.png',
  cumulus: 'SCUM.png',
  'dorian-nickel': 'SDORNI.png',
  'dorian-patina': 'SDORPA.png',
  dutchcraft: 'SDUT.png',
  edgewood: 'SEDG.png',
  'elegant-black-white': 'SELEBW.png',
  'elegant-nickel': 'SELENI.png',
  'elegant-patina': 'SELEPA.png',
  empire: 'SEMP.png',
  's-f5': 'SF5.png',
  's-f5l': 'SF5L.png',
  clear: 'SF10.png',
  'grace-nickel': 'SGRA.png',
  'heirlooms-brass': 'SHEIBB.png',
  'heirlooms-nickel': 'SHEINI.png',
  jacinto: 'SJAC.png',
  jameston: 'SJAM.png',
  laurel: 'SLAU.png',
  lazarus: 'SLAZ.png',
  leland: 'SLEL.png',
  lexington: 'SLEX.png',
  linen: 'SLIN.png',
  london: 'SLON.png',
  'majestic-patina': 'SMAJ.png',
  margate: 'SMAR.png',
  metro: 'SMET.png',
  'micro-granite': 'SMIC.png',
  mohave: 'SMOH.png',
  'monterey-nickel': 'SMONNI.png',
  'monterey-patina': 'SMONPA.png',
  neo: 'SNEO.png',
  'nouveau-nickel': 'SNOUNI.png',
  'nouveau-patina': 'SNOUPA.png',
  'oak-park': 'SOAK.png',
  paris: 'SPAR.png',
  pembrook: 'SPEM.png',
  prestige: 'SPRE.png',
  rain: 'SRAI.png',
  'renewed-impressions': 'SREN.png',
  riverwood: 'SRIV.png',
  'blinds-espresso': 'SRLBES.png',
  'blinds-gray': 'SRLBGR.png',
  'blinds-sand': 'SRLBSA.png',
  'blinds-silver': 'SRLBSI.png',
  'blinds-tan': 'SRLBTA.png',
  'blinds-white': 'SRLBWH.png',
  's-s5l': 'SS5L.png',
  's-s9int': 'SS9INT.png',
  's-s9intl': 'SS9INTL.png',
  blinds: 'SSRLB9.png',
  's-sv9': 'SSV9.png',
  topaz: 'STOP.png',
  vapor: 'SVAP.png',
  vilano: 'SVIL.png',
  waterside: 'SWTS.png',
}

const fOverlays: Record<string, string> = {
  ashbury: 'FASH.png',
  'bay-point': 'FBAY.png',
  blanca: 'FBLA.png',
  bristol: 'FBRI.png',
  cadence: 'FCAD.png',
  calandra: 'FCAL.png',
  carrollton: 'FCAR.png',
  cobblestone: 'FCOB.png',
  courtyard: 'FCOU.png',
  crosswalk: 'FCRO.png',
  cumulus: 'FCUM.png',
  'dorian-nickel': 'FDORNI.png',
  'dorian-patina': 'FDORPA.png',
  dutchcraft: 'FDUT.png',
  edgewood: 'FEDG.png',
  'elegant-black-white': 'FELEBW.png',
  'elegant-nickel': 'FELEPN.png',
  'elegant-patina': 'FELEPA.png',
  entropy: 'FENT.png',
  clear: 'FF10.png',
  'f-f10l': 'FF10L.png',
  'f-f15wh': 'FF15WH.png',
  'f-prairie-internal': 'FFPRAINT.png',
  'f-blinds-15': 'FFRLB15.png',
  'f-ten-lite': 'FFTEN.png',
  geneva: 'FGEN.png',
  'grace-nickel': 'FGRA.png',
  'heirlooms-brass': 'FHEIBB.png',
  'heirlooms-nickel': 'FHEINI.png',
  'high-point': 'FHIG.png',
  jacinto: 'FJAC.png',
  jameston: 'FJAM.png',
  laurel: 'FLAU.png',
  lazarus: 'FLAZ.png',
  leland: 'FLEL.png',
  lexington: 'FLEX.png',
  linen: 'FLIN.png',
  london: 'FLON.png',
  'f-madison': 'FMAD.png',
  'majestic-patina': 'FMAJ.png',
  'majestic-nickel': 'FMAJNI.png',
  'micro-granite': 'FMIC.png',
  mohave: 'FMOH.png',
  'monterey-patina': 'FMONPA.png',
  'monterey-nickel': 'FMONSN.png',
  'nouveau-nickel': 'FNOUNI.png',
  'nouveau-patina': 'FNOUPA.png',
  'oak-park': 'FOAK.png',
  ovation: 'FOVA.png',
  paris: 'FPAR.png',
  pembrook: 'FPEM.png',
  prestige: 'FPRE.png',
  rain: 'FRAI.png',
  'renewed-impressions': 'FREN.png',
  riverwood: 'FRIV.png',
  'blinds-espresso': 'FRLBES.png',
  'blinds-gray': 'FRLBGR.png',
  'blinds-sand': 'FRLBSA.png',
  'blinds-silver': 'FRLBSI.png',
  'blinds-tan': 'FRLBTA.png',
  'blinds-white': 'FRLBWH.png',
  steamed: 'FSTE.png',
  topaz: 'FTOP.png',
  vapor: 'FVAP.png',
  vilano: 'FVIL.png',
  waterside: 'FWTS.png',
}

const f482Overlays: Record<string, string> = {
  ashbury: 'F482Ashbury.png',
  berkley: 'F482Berkley.png',
  briselle: 'F482Briselle.png',
  cadence: 'F482Cadence.png',
  calandra: 'F482Calandra.png',
  courtyard: 'F482Courtyard.png',
  crosswalk: 'F482Crosswalk.png',
  cyndi: 'F482Cyndi.png',
  'dorian-nickel': 'F482Dorian.png',
  'dorian-patina': 'F482Dorian.png',
  edgewood: 'F482Edgewood.png',
  'elegant-black-white': 'F482Elegant.png',
  'elegant-nickel': 'F482Elegant.png',
  'elegant-patina': 'F482Elegant.png',
  empire: 'F482Empire.png',
  fragrance: 'F482Fragrance.png',
  garrison: 'F482Garrison.png',
  'grace-nickel': 'F482Grace.png',
  'grace-patina': 'F482Grace.png',
  'heirlooms-brass': 'F482Heirlooms.png',
  'heirlooms-nickel': 'F482Heirlooms.png',
  'high-point': 'F482Highpoint.png',
  jameston: 'F482Jameston.png',
  'majestic-nickel': 'F482Majestic.png',
  'majestic-patina': 'F482Majestic.png',
  margate: 'F482Margate.png',
  metro: 'F482Metro.png',
  mistify: 'F482Mistify.png',
  mohave: 'F482Mohave.png',
  'monterey-nickel': 'F482Monterey.png',
  'monterey-patina': 'F482Monterey.png',
  neo: 'F482Neo.png',
  'nouveau-nickel': 'F482Nouvea.png',
  'nouveau-patina': 'F482Nouvea.png',
  'oak-park': 'F482Oakpark.png',
  paris: 'F482Paris.png',
  pembrook: 'F482Pembrook.png',
  prestige: 'F482Prestige.png',
  rill: 'F482Rill.png',
  riverwood: 'F482Riverwood.png',
  sterling: 'F482Sterling.png',
  topaz: 'F482Topaz.png',
  vilano: 'F482Vilano.png',
  vincraft: 'F482Vincraft.png',
  waterside: 'F482Waterside.png',
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
  { id: 'blinds-espresso', name: 'Blinds - Espresso', image: '/assets/glass/Blinds.png' },
  { id: 'blinds-gray', name: 'Blinds - Gray', image: '/assets/glass/Blinds.png' },
  { id: 'blinds-sand', name: 'Blinds - Sand', image: '/assets/glass/Blinds.png' },
  { id: 'blinds-silver', name: 'Blinds - Silver', image: '/assets/glass/Blinds.png' },
  { id: 'blinds-tan', name: 'Blinds - Tan', image: '/assets/glass/Blinds.png' },
  { id: 'blinds-white', name: 'Blinds - White', image: '/assets/glass/Blinds.png' },
  { id: 'f-f10l', name: 'F10L', image: '/assets/glass/Clear.png' },
  { id: 'f-f15wh', name: 'F15 White Grid', image: '/assets/glass/Clear.png' },
  { id: 'f-prairie-internal', name: 'Prairie Internal', image: '/assets/glass/Clear.png' },
  { id: 'f-blinds-15', name: 'Blinds - 15 Lite', image: '/assets/glass/Blinds.png' },
  { id: 'f-ten-lite', name: 'Ten Lite', image: '/assets/glass/Clear.png' },
  { id: 'f-madison', name: 'Madison', image: '/assets/glass/Decorative.png' },
  { id: 's-f5', name: 'F5', image: '/assets/glass/Clear.png' },
  { id: 's-f5l', name: 'F5L', image: '/assets/glass/Clear.png' },
  { id: 's-s5l', name: 'S5L', image: '/assets/glass/Clear.png' },
  { id: 's-s9int', name: 'S9 Internal', image: '/assets/glass/Clear.png' },
  { id: 's-s9intl', name: 'S9 Internal Lite', image: '/assets/glass/Clear.png' },
  { id: 's-sv9', name: 'SV9', image: '/assets/glass/Clear.png' },
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
  const caOverlay = caOverlays[option.id]
  const threeLtOverlay = threeLtOverlays[option.id]
  const threeStepOverlay = threeStepOverlays[option.id]
  const fourLtOverlay = fourLtOverlays[option.id]
  const fiveLtOverlay = fiveLtOverlays[option.id]
  const f2Overlay = f2Overlays[option.id]
  const f3Overlay = f3Overlays[option.id]
  const f4Overlay = f4Overlays[option.id]
  const f764Overlay = f764Overlays[option.id]
  const sOverlay = sOverlays[option.id]
  const fOverlay = fOverlays[option.id]
  const f482Overlay = f482Overlays[option.id]
  const s836Overlay = s836Overlays[option.id]
  const swOverlay = swOverlays[option.id]

  if (cr14Overlay) {
    overlaysByDoorStyle.CR14 = `/assets/glass/overlays/CR14/${cr14Overlay}?v=3`
    overlaysByDoorStyle.CR14PL = `/assets/glass/overlays/CR14/${cr14Overlay}?v=3`
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

  if (caOverlay) {
    overlaysByDoorStyle.CA = `/assets/glass/overlays/CA/${caOverlay}?v=1`
  }

  if (threeLtOverlay) {
    overlaysByDoorStyle['3LT'] = `/assets/glass/overlays/3LT/${threeLtOverlay}?v=1`
  }

  if (threeStepOverlay) {
    overlaysByDoorStyle['3STEP'] = `/assets/glass/overlays/3STEP/${threeStepOverlay}?v=1`
  }

  if (fourLtOverlay) {
    overlaysByDoorStyle['4LT'] = `/assets/glass/overlays/4LT/${fourLtOverlay}?v=1`
  }

  if (fiveLtOverlay) {
    overlaysByDoorStyle['5LT'] = `/assets/glass/overlays/5LT/${fiveLtOverlay}?v=1`
  }

  if (f2Overlay) {
    overlaysByDoorStyle.F2 = `/glass-options/${f2Overlay}?v=1`
  }

  if (f3Overlay) {
    overlaysByDoorStyle.F3 = `/glass-options/${f3Overlay}?v=1`
  }

  if (f4Overlay) {
    overlaysByDoorStyle.F4 = `/glass-options/${f4Overlay}?v=1`
  }

  if (f764Overlay) {
    overlaysByDoorStyle.F764 = `/assets/glass/overlays/F764/${f764Overlay}?v=1`
  }

  if (sOverlay) {
    overlaysByDoorStyle.S = `/assets/glass/overlays/S/${sOverlay}?v=1`
  }

  if (fOverlay) {
    overlaysByDoorStyle.F = `/assets/glass/overlays/F/${fOverlay}?v=1`
  }

  if (f482Overlay) {
    overlaysByDoorStyle.F48 = `/assets/glass/overlays/F482/${f482Overlay}?v=1`
    overlaysByDoorStyle.F482 = `/assets/glass/overlays/F482/${f482Overlay}?v=1`
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
