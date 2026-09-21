import type { GlassOption } from '../types'
import { approvedPrivacyGlassIds, knownPrivacyGlassIds } from './privacyGlass'
import { approvedDecorativeGlassIds, knownDecorativeGlassIds } from './decorativeGlass'

const glassPreviewAssets: Record<string, string> = {
  "CR14BAY.webp": "/assets/hgi-assets/Glass/CR14/CR14BAY.webp",
  "CR14BLA.webp": "/assets/hgi-assets/Glass/CR14/CR14BLA.webp",
  "CR14CEL.webp": "/assets/hgi-assets/Glass/CR14/CR14CEL.webp",
  "CR14CHI.webp": "/assets/hgi-assets/Glass/CR14/CR14CHI.webp",
  "CR14COB.webp": "/assets/hgi-assets/Glass/CR14/CR14COB.webp",
  "CR14COU.webp": "/assets/hgi-assets/Glass/CR14/CR14COU.webp",
  "CR14CRO.webp": "/assets/hgi-assets/Glass/CR14/CR14CRO.webp",
  "CR14CUM.webp": "/assets/hgi-assets/Glass/CR14/CR14CUM.webp",
  "CR14DORNI.webp": "/assets/hgi-assets/Glass/CR14/CR14DORNI.webp",
  "CR14DORPA.webp": "/assets/hgi-assets/Glass/CR14/CR14DORPA.webp",
  "CR14DUT.webp": "/assets/hgi-assets/Glass/CR14/CR14DUT.webp",
  "CR14EDG.webp": "/assets/hgi-assets/Glass/CR14/CR14EDG.webp",
  "CR14LAU.webp": "/assets/hgi-assets/Glass/CR14/CR14LAU.webp",
  "CR14LEL.webp": "/assets/hgi-assets/Glass/CR14/CR14LEL.webp",
  "CR14LIN.webp": "/assets/hgi-assets/Glass/CR14/CR14LIN.webp",
  "CR14MAR.webp": "/assets/hgi-assets/Glass/CR14/CR14MAR.webp",
  "CR14MIC.webp": "/assets/hgi-assets/Glass/CR14/CR14MIC.webp",
  "CR14MIS.webp": "/assets/hgi-assets/Glass/CR14/CR14MIS.webp",
  "CR14MONNI.webp": "/assets/hgi-assets/Glass/CR14/CR14MONNI.webp",
  "CR14MONPA.webp": "/assets/hgi-assets/Glass/CR14/CR14MONPA.webp",
  "CR14OAK.webp": "/assets/hgi-assets/Glass/CR14/CR14OAK.webp",
  "CR14PAR.webp": "/assets/hgi-assets/Glass/CR14/CR14PAR.webp",
  "CR14PEM.webp": "/assets/hgi-assets/Glass/CR14/CR14PEM.webp",
  "CR14RAI.webp": "/assets/hgi-assets/Glass/CR14/CR14RAI.webp",
  "CR14RIV.webp": "/assets/hgi-assets/Glass/CR14/CR14RIV.webp",
  "CR14STR.webp": "/assets/hgi-assets/Glass/CR14/CR14STR.webp",
  "CR14TOP.webp": "/assets/hgi-assets/Glass/CR14/CR14TOP.webp",
  "CR14VAP.webp": "/assets/hgi-assets/Glass/CR14/CR14VAP.webp",
  "CR14VIL.webp": "/assets/hgi-assets/Glass/CR14/CR14VIL.webp",
  "CR14VIN.webp": "/assets/hgi-assets/Glass/CR14/CR14VIN.webp",
  "CR14WYN.webp": "/assets/hgi-assets/Glass/CR14/CR14WYN.webp",
  "F848BER.webp": "/assets/hgi-assets/Glass/F848/F848BER.webp",
  "F848BLA.webp": "/assets/hgi-assets/Glass/F848/F848BLA.webp",
  "F848CAD.webp": "/assets/hgi-assets/Glass/F848/F848CAD.webp",
  "F848CAL.webp": "/assets/hgi-assets/Glass/F848/F848CAL.webp",
  "F848CAR.webp": "/assets/hgi-assets/Glass/F848/F848CAR.webp",
  "F848CHI.webp": "/assets/hgi-assets/Glass/F848/F848CHI.webp",
  "F848COU.webp": "/assets/hgi-assets/Glass/F848/F848COU.webp",
  "F848CRO.webp": "/assets/hgi-assets/Glass/F848/F848CRO.webp",
  "F848CUM.webp": "/assets/hgi-assets/Glass/F848/F848CUM.webp",
  "F848DORNI.webp": "/assets/hgi-assets/Glass/F848/F848DORNI.webp",
  "F848DORPA.webp": "/assets/hgi-assets/Glass/F848/F848DORPA.webp",
  "F848ELEBW.webp": "/assets/hgi-assets/Glass/F848/F848ELEBW.webp",
  "F848ELENI.webp": "/assets/hgi-assets/Glass/F848/F848ELENI.webp",
  "F848ELEPA.webp": "/assets/hgi-assets/Glass/F848/F848ELEPA.webp",
  "F848EMP.webp": "/assets/hgi-assets/Glass/F848/F848EMP.webp",
  "F848F10.webp": "/assets/hgi-assets/Glass/F848/F848F10.webp",
  "F848GEN.webp": "/assets/hgi-assets/Glass/F848/F848GEN.webp",
  "F848GRAPA.webp": "/assets/hgi-assets/Glass/F848/F848GRAPA.webp",
  "F848HEIBB.webp": "/assets/hgi-assets/Glass/F848/F848HEIBB.webp",
  "F848HEINI.webp": "/assets/hgi-assets/Glass/F848/F848HEINI.webp",
  "F848HIG.webp": "/assets/hgi-assets/Glass/F848/F848HIG.webp",
  "F848JAC.webp": "/assets/hgi-assets/Glass/F848/F848JAC.webp",
  "F848LIN.webp": "/assets/hgi-assets/Glass/F848/F848LIN.webp",
  "F848MAJNI.webp": "/assets/hgi-assets/Glass/F848/F848MAJNI.webp",
  "F848MAR.webp": "/assets/hgi-assets/Glass/F848/F848MAR.webp",
  "F848MET.webp": "/assets/hgi-assets/Glass/F848/F848MET.webp",
  "F848MIC.webp": "/assets/hgi-assets/Glass/F848/F848MIC.webp",
  "F848MIS.webp": "/assets/hgi-assets/Glass/F848/F848MIS.webp",
  "F848MONPA.webp": "/assets/hgi-assets/Glass/F848/F848MONPA.webp",
  "F848NEO.webp": "/assets/hgi-assets/Glass/F848/F848NEO.webp",
  "F848NOUNI.webp": "/assets/hgi-assets/Glass/F848/F848NOUNI.webp",
  "F848NOUPA.webp": "/assets/hgi-assets/Glass/F848/F848NOUPA.webp",
  "F848OAK.webp": "/assets/hgi-assets/Glass/F848/F848OAK.webp",
  "F848PAR.webp": "/assets/hgi-assets/Glass/F848/F848PAR.webp",
  "F848PRE.webp": "/assets/hgi-assets/Glass/F848/F848PRE.webp",
  "F848RAI.webp": "/assets/hgi-assets/Glass/F848/F848RAI.webp",
  "F848TOP.webp": "/assets/hgi-assets/Glass/F848/F848TOP.webp",
  "F848VAP.webp": "/assets/hgi-assets/Glass/F848/F848VAP.webp",
  "F848VIL.webp": "/assets/hgi-assets/Glass/F848/F848VIL.webp",
  "F848WAT.webp": "/assets/hgi-assets/Glass/F848/F848WAT.webp",
  "FASH.webp": "/assets/hgi-assets/Glass/F/DECO/FASH.webp",
  "FBAY.webp": "/assets/hgi-assets/Glass/F/DECO/FBAY.webp",
  "F/FBAY.webp": "/assets/hgi-assets/Glass/F/DECO/FBAY.webp",
  "FBLA.webp": "/assets/hgi-assets/Glass/F/DECO/FBLA.webp",
  "F/FBLA.webp": "/assets/hgi-assets/Glass/F/DECO/FBLA.webp",
  "FBRI.webp": "/assets/hgi-assets/Glass/F/DECO/FBRI.webp",
  "F/FBRI.webp": "/assets/hgi-assets/Glass/F/DECO/FBRI.webp",
  "FCAD.webp": "/assets/hgi-assets/Glass/F/DECO/FCAD.webp",
  "F/FCAD.webp": "/assets/hgi-assets/Glass/F/DECO/FCAD.webp",
  "FCAL.webp": "/assets/hgi-assets/Glass/F/DECO/FCAL.webp",
  "F/FCAL.webp": "/assets/hgi-assets/Glass/F/DECO/FCAL.webp",
  "FCAR.webp": "/assets/hgi-assets/Glass/F/DECO/FCAR.webp",
  "F/FCAR.webp": "/assets/hgi-assets/Glass/F/DECO/FCAR.webp",
  "FCOB.webp": "/assets/hgi-assets/Glass/F/DECO/FCOB.webp",
  "F/FCOB.webp": "/assets/hgi-assets/Glass/F/DECO/FCOB.webp",
  "FCOU.webp": "/assets/hgi-assets/Glass/F/DECO/FCOU.webp",
  "F/FCOU.webp": "/assets/hgi-assets/Glass/F/DECO/FCOU.webp",
  "FCRO.webp": "/assets/hgi-assets/Glass/F/DECO/FCRO.webp",
  "F/FCRO.webp": "/assets/hgi-assets/Glass/F/DECO/FCRO.webp",
  "FCUM.webp": "/assets/hgi-assets/Glass/F/DECO/FCUM.webp",
  "F/FCUM.webp": "/assets/hgi-assets/Glass/F/DECO/FCUM.webp",
  "FDORNI.webp": "/assets/hgi-assets/Glass/F/DECO/FDORNI.webp",
  "F/FDORNI.webp": "/assets/hgi-assets/Glass/F/DECO/FDORNI.webp",
  "FDORPA.webp": "/assets/hgi-assets/Glass/F/DECO/FDORPA.webp",
  "F/FDORPA.webp": "/assets/hgi-assets/Glass/F/DECO/FDORPA.webp",
  "FDUT.webp": "/assets/hgi-assets/Glass/F/DECO/FDUT.webp",
  "F/FDUT.webp": "/assets/hgi-assets/Glass/F/DECO/FDUT.webp",
  "FEDG.webp": "/assets/hgi-assets/Glass/F/DECO/FEDG.webp",
  "F/FEDG.webp": "/assets/hgi-assets/Glass/F/DECO/FEDG.webp",
  "FELEBW.webp": "/assets/hgi-assets/Glass/F/DECO/FELEBW.webp",
  "FELEPA.webp": "/assets/hgi-assets/Glass/F/DECO/FELEPA.webp",
  "FELEPN.webp": "/assets/hgi-assets/Glass/F/DECO/FELEPN.webp",
  "FENT.webp": "/assets/hgi-assets/Glass/F/DECO/FENT.webp",
  "FF10.webp": "/assets/hgi-assets/Glass/F/CLEAR STOCK/FF10.webp",
  "FF10L.webp": "/assets/hgi-assets/Glass/F/CLEAR STOCK/FF10L.webp",
  "FF15WH.webp": "/assets/hgi-assets/Glass/F/CLEAR STOCK/FF15WH.webp",
  "FFPRAINT.webp": "/assets/hgi-assets/Glass/F/CLEAR STOCK/FFPRAINT.webp",
  "FFRLB15.webp": "/assets/hgi-assets/Glass/F/DECO/FFRLB15.webp",
  "FFTEN.webp": "/assets/hgi-assets/Glass/F/CLEAR STOCK/FFTEN.webp",
  "FGEN.webp": "/assets/hgi-assets/Glass/F/DECO/FGEN.webp",
  "FGRA.webp": "/assets/hgi-assets/Glass/F/DECO/FGRA.webp",
  "FHEIBB.webp": "/assets/hgi-assets/Glass/F/DECO/FHEIBB.webp",
  "FHEINI.webp": "/assets/hgi-assets/Glass/F/DECO/FHEINI.webp",
  "FHIG.webp": "/assets/hgi-assets/Glass/F/DECO/FHIG.webp",
  "FJAC.webp": "/assets/hgi-assets/Glass/F/DECO/FJAC.webp",
  "FJAM.webp": "/assets/hgi-assets/Glass/F/DECO/FJAM.webp",
  "FLAU.webp": "/assets/hgi-assets/Glass/F/DECO/FLAU.webp",
  "FLAZ.webp": "/assets/hgi-assets/Glass/F/DECO/FLAZ.webp",
  "FLEL.webp": "/assets/hgi-assets/Glass/F/DECO/FLEL.webp",
  "FLEX.webp": "/assets/hgi-assets/Glass/F/DECO/FLEX.webp",
  "FLIN.webp": "/assets/hgi-assets/Glass/F/DECO/FLIN.webp",
  "FLON.webp": "/assets/hgi-assets/Glass/F/DECO/FLON.webp",
  "FMAD.webp": "/assets/hgi-assets/Glass/F/DECO/FMAD.webp",
  "FMAJ.webp": "/assets/hgi-assets/Glass/F/DECO/FMAJ.webp",
  "FMAJNI.webp": "/assets/hgi-assets/Glass/F/DECO/FMAJNI.webp",
  "FMIC.webp": "/assets/hgi-assets/Glass/F/DECO/FMIC.webp",
  "FMOH.webp": "/assets/hgi-assets/Glass/F/DECO/FMOH.webp",
  "FMONPA.webp": "/assets/hgi-assets/Glass/F/DECO/FMONPA.webp",
  "FMONSN.webp": "/assets/hgi-assets/Glass/F/DECO/FMONSN.webp",
  "FNOUNI.webp": "/assets/hgi-assets/Glass/F/DECO/FNOUNI.webp",
  "FNOUPA.webp": "/assets/hgi-assets/Glass/F/DECO/FNOUPA.webp",
  "FOAK.webp": "/assets/hgi-assets/Glass/F/DECO/FOAK.webp",
  "FOCAD.webp": "/assets/hgi-assets/Glass/FO/FOCAD.webp",
  "FOFOCL.webp": "/assets/hgi-assets/Glass/FO/FOFOCL.webp",
  "FOGRANI.webp": "/assets/hgi-assets/Glass/FO/FOGRANI.webp",
  "FOGRAPA.webp": "/assets/hgi-assets/Glass/FO/FOGRAPA.webp",
  "FOHEIBB.webp": "/assets/hgi-assets/Glass/FO/FOHEIBB.webp",
  "FOHEINI.webp": "/assets/hgi-assets/Glass/FO/FOHEINI.webp",
  "FONOUNI.webp": "/assets/hgi-assets/Glass/FO/FONOUNI.webp",
  "FONOUPA.webp": "/assets/hgi-assets/Glass/FO/FONOUPA.webp",
  "FOVA.webp": "/assets/hgi-assets/Glass/F/DECO/FOVA.webp",
  "FPAR.webp": "/assets/hgi-assets/Glass/F/DECO/FPAR.webp",
  "FPEM.webp": "/assets/hgi-assets/Glass/F/DECO/FPEM.webp",
  "FPRE.webp": "/assets/hgi-assets/Glass/F/DECO/FPRE.webp",
  "FRAI.webp": "/assets/hgi-assets/Glass/F/DECO/FRAI.webp",
  "FREN.webp": "/assets/hgi-assets/Glass/F/DECO/FREN.webp",
  "FRIV.webp": "/assets/hgi-assets/Glass/F/DECO/FRIV.webp",
  "FRLBES.webp": "/assets/hgi-assets/Glass/F/DECO/FRLBES.webp",
  "FRLBGR.webp": "/assets/hgi-assets/Glass/F/DECO/FRLBGR.webp",
  "FRLBSA.webp": "/assets/hgi-assets/Glass/F/DECO/FRLBSA.webp",
  "FRLBSI.webp": "/assets/hgi-assets/Glass/F/DECO/FRLBSI.webp",
  "FRLBTA.webp": "/assets/hgi-assets/Glass/F/DECO/FRLBTA.webp",
  "FRLBWH.webp": "/assets/hgi-assets/Glass/F/DECO/FRLBWH.webp",
  "FSTE.webp": "/assets/hgi-assets/Glass/F/DECO/FSTE.webp",
  "FTOP.webp": "/assets/hgi-assets/Glass/F/DECO/FTOP.webp",
  "FVAP.webp": "/assets/hgi-assets/Glass/F/DECO/FVAP.webp",
  "FVIL.webp": "/assets/hgi-assets/Glass/F/DECO/FVIL.webp",
  "FWTS.webp": "/assets/hgi-assets/Glass/F/DECO/FWTS.webp",
  "QAGRANI.webp": "/assets/hgi-assets/Glass/QA/QAGRANI.webp",
  "QAGRAPA.webp": "/assets/hgi-assets/Glass/QA/QAGRAPA.webp",
  "QALON.webp": "/assets/hgi-assets/Glass/QA/QALON.webp",
  "QANOUNI.webp": "/assets/hgi-assets/Glass/QA/QANOUNI.webp",
  "QANOUPA.webp": "/assets/hgi-assets/Glass/QA/QANOUPA.webp",
  "QAPEM.webp": "/assets/hgi-assets/Glass/QA/QAPEM.webp",
  "QAQACL.webp": "/assets/hgi-assets/Glass/QA/QAQACL.webp",
  "QARIV.webp": "/assets/hgi-assets/Glass/QA/QARIV.webp",
  "QAVIN.webp": "/assets/hgi-assets/Glass/QA/QAVIN.webp",
  "QAWYN.webp": "/assets/hgi-assets/Glass/QA/QAWYN.webp",
  "S836BER.webp": "/assets/hgi-assets/Glass/S836/S836BER.webp",
  "S836BLA.webp": "/assets/hgi-assets/Glass/S836/S836BLA.webp",
  "S836CHI.webp": "/assets/hgi-assets/Glass/S836/S836CHI.webp",
  "S836COU.webp": "/assets/hgi-assets/Glass/S836/S836COU.webp",
  "S836CRO.webp": "/assets/hgi-assets/Glass/S836/S836CRO.webp",
  "S836CUM.webp": "/assets/hgi-assets/Glass/S836/S836CUM.webp",
  "S836DORNI.webp": "/assets/hgi-assets/Glass/S836/S836DORNI.webp",
  "S836DORPA.webp": "/assets/hgi-assets/Glass/S836/S836DORPA.webp",
  "S836ELEBW.webp": "/assets/hgi-assets/Glass/S836/S836ELEBW.webp",
  "S836ELEPA.webp": "/assets/hgi-assets/Glass/S836/S836ELEPA.webp",
  "S836ELEPN.webp": "/assets/hgi-assets/Glass/S836/S836ELEPN.webp",
  "S836EMP.webp": "/assets/hgi-assets/Glass/S836/S836EMP.webp",
  "S836F10.webp": "/assets/hgi-assets/Glass/S836/S836F10.webp",
  "S836GRA.webp": "/assets/hgi-assets/Glass/S836/S836GRA.webp",
  "S836H8RLB.webp": "/assets/hgi-assets/Glass/S836/S836H8RLB.webp",
  "S836HEIBB.webp": "/assets/hgi-assets/Glass/S836/S836HEIBB.webp",
  "S836HEINI.webp": "/assets/hgi-assets/Glass/S836/S836HEINI.webp",
  "S836LAS.webp": "/assets/hgi-assets/Glass/S836/S836LAS.webp",
  "S836LIN.webp": "/assets/hgi-assets/Glass/S836/S836LIN.webp",
  "S836MAJPA.webp": "/assets/hgi-assets/Glass/S836/S836MAJPA.webp",
  "S836MAR.webp": "/assets/hgi-assets/Glass/S836/S836MAR.webp",
  "S836MET.webp": "/assets/hgi-assets/Glass/S836/S836MET.webp",
  "S836MIC.webp": "/assets/hgi-assets/Glass/S836/S836MIC.webp",
  "S836MOH.webp": "/assets/hgi-assets/Glass/S836/S836MOH.webp",
  "S836NEO.webp": "/assets/hgi-assets/Glass/S836/S836NEO.webp",
  "S836NOUNI.webp": "/assets/hgi-assets/Glass/S836/S836NOUNI.webp",
  "S836NOUPA.webp": "/assets/hgi-assets/Glass/S836/S836NOUPA.webp",
  "S836PAR.webp": "/assets/hgi-assets/Glass/S836/S836PAR.webp",
  "S836PRE.webp": "/assets/hgi-assets/Glass/S836/S836PRE.webp",
  "S836RAI.webp": "/assets/hgi-assets/Glass/S836/S836RAI.webp",
  "S836REN.webp": "/assets/hgi-assets/Glass/S836/S836REN.webp",
  "S836TOP.webp": "/assets/hgi-assets/Glass/S836/S836TOP.webp",
  "S836VAP.webp": "/assets/hgi-assets/Glass/S836/S836VAP.webp",
  "S836VIL.webp": "/assets/hgi-assets/Glass/S836/S836VIL.webp",
  "S836WAT.webp": "/assets/hgi-assets/Glass/S836/S836WAT.webp",
  "SBER.webp": "/assets/hgi-assets/Glass/S/DECO/SBER.webp",
  "SBLA.webp": "/assets/hgi-assets/Glass/S/DECO/SBLA.webp",
  "SBRI.webp": "/assets/hgi-assets/Glass/S/DECO/SBRI.webp",
  "SCHI.webp": "/assets/hgi-assets/Glass/S/DECO/SCHI.webp",
  "SCOB.webp": "/assets/hgi-assets/Glass/S/DECO/SCOB.webp",
  "SCOU.webp": "/assets/hgi-assets/Glass/S/DECO/SCOU.webp",
  "SCRO.webp": "/assets/hgi-assets/Glass/S/DECO/SCRO.webp",
  "SCUM.webp": "/assets/hgi-assets/Glass/S/DECO/SCUM.webp",
  "SDORNI.webp": "/assets/hgi-assets/Glass/S/DECO/SDORNI.webp",
  "SDORPA.webp": "/assets/hgi-assets/Glass/S/DECO/SDORPA.webp",
  "SDUT.webp": "/assets/hgi-assets/Glass/S/DECO/SDUT.webp",
  "SEDG.webp": "/assets/hgi-assets/Glass/S/DECO/SEDG.webp",
  "SELEBW.webp": "/assets/hgi-assets/Glass/S/DECO/SELEBW.webp",
  "SELENI.webp": "/assets/hgi-assets/Glass/S/DECO/SELENI.webp",
  "SELEPA.webp": "/assets/hgi-assets/Glass/S/DECO/SELEPA.webp",
  "SEMP.webp": "/assets/hgi-assets/Glass/S/DECO/SEMP.webp",
  "SF10.webp": "/assets/hgi-assets/Glass/S/DECO/SF10.webp",
  "SF5.webp": "/assets/hgi-assets/Glass/S/DECO/SF5.webp",
  "SF5L.webp": "/assets/hgi-assets/Glass/S/DECO/SF5L.webp",
  "SGRA.webp": "/assets/hgi-assets/Glass/S/DECO/SGRA.webp",
  "SHEIBB.webp": "/assets/hgi-assets/Glass/S/DECO/SHEIBB.webp",
  "SHEINI.webp": "/assets/hgi-assets/Glass/S/DECO/SHEINI.webp",
  "SJAC.webp": "/assets/hgi-assets/Glass/S/DECO/SJAC.webp",
  "SJAM.webp": "/assets/hgi-assets/Glass/S/DECO/SJAM.webp",
  "SLAU.webp": "/assets/hgi-assets/Glass/S/DECO/SLAU.webp",
  "SLAZ.webp": "/assets/hgi-assets/Glass/S/DECO/SLAZ.webp",
  "SLEL.webp": "/assets/hgi-assets/Glass/S/DECO/SLEL.webp",
  "SLEX.webp": "/assets/hgi-assets/Glass/S/DECO/SLEX.webp",
  "SLIN.webp": "/assets/hgi-assets/Glass/S/DECO/SLIN.webp",
  "SLON.webp": "/assets/hgi-assets/Glass/S/DECO/SLON.webp",
  "SMAJ.webp": "/assets/hgi-assets/Glass/S/DECO/SMAJ.webp",
  "SMAR.webp": "/assets/hgi-assets/Glass/S/DECO/SMAR.webp",
  "SMET.webp": "/assets/hgi-assets/Glass/S/DECO/SMET.webp",
  "SMIC.webp": "/assets/hgi-assets/Glass/S/DECO/SMIC.webp",
  "SMOH.webp": "/assets/hgi-assets/Glass/S/DECO/SMOH.webp",
  "SMONNI.webp": "/assets/hgi-assets/Glass/S/DECO/SMONNI.webp",
  "SMONPA.webp": "/assets/hgi-assets/Glass/S/DECO/SMONPA.webp",
  "SNEO.webp": "/assets/hgi-assets/Glass/S/DECO/SNEO.webp",
  "SNOUNI.webp": "/assets/hgi-assets/Glass/S/DECO/SNOUNI.webp",
  "SNOUPA.webp": "/assets/hgi-assets/Glass/S/DECO/SNOUPA.webp",
  "SOAK.webp": "/assets/hgi-assets/Glass/S/DECO/SOAK.webp",
  "SOBRI.webp": "/assets/hgi-assets/Glass/SO/SOBRI.webp",
  "SOCAD.webp": "/assets/hgi-assets/Glass/SO/SOCAD.webp",
  "SOCAR.webp": "/assets/hgi-assets/Glass/SO/SOCAR.webp",
  "SOELENI.webp": "/assets/hgi-assets/Glass/SO/SOELENI.webp",
  "SOELEPA.webp": "/assets/hgi-assets/Glass/SO/SOELEPA.webp",
  "SOGRC.webp": "/assets/hgi-assets/Glass/SO/SOGRC.webp",
  "SOHEIBB.webp": "/assets/hgi-assets/Glass/SO/SOHEIBB.webp",
  "SOHEINI.webp": "/assets/hgi-assets/Glass/SO/SOHEINI.webp",
  "SOJAM.webp": "/assets/hgi-assets/Glass/S/DECO/SOJAM.webp",
  "S/SOJAM.webp": "/assets/hgi-assets/Glass/S/DECO/SOJAM.webp",
  "SO/SOJAM.webp": "/assets/hgi-assets/Glass/SO/SOJAM.webp",
  "SOLAU.webp": "/assets/hgi-assets/Glass/S/DECO/SOLAU.webp",
  "S/SOLAU.webp": "/assets/hgi-assets/Glass/S/DECO/SOLAU.webp",
  "SO/SOLAU.webp": "/assets/hgi-assets/Glass/SO/SOLAU.webp",
  "SONOUNI.webp": "/assets/hgi-assets/Glass/SO/SONOUNI.webp",
  "SONOUPA.webp": "/assets/hgi-assets/Glass/SO/SONOUPA.webp",
  "SOOVA.webp": "/assets/hgi-assets/Glass/SO/SOOVA.webp",
  "SORAI.webp": "/assets/hgi-assets/Glass/SO/SORAI.webp",
  "SOREN.webp": "/assets/hgi-assets/Glass/SO/SOREN.webp",
  "SPAR.webp": "/assets/hgi-assets/Glass/S/DECO/SPAR.webp",
  "SPEM.webp": "/assets/hgi-assets/Glass/S/DECO/SPEM.webp",
  "SPRE.webp": "/assets/hgi-assets/Glass/S/DECO/SPRE.webp",
  "SRAI.webp": "/assets/hgi-assets/Glass/S/DECO/SRAI.webp",
  "SREN.webp": "/assets/hgi-assets/Glass/S/DECO/SREN.webp",
  "SRIV.webp": "/assets/hgi-assets/Glass/S/DECO/SRIV.webp",
  "SRLBES.webp": "/assets/hgi-assets/Glass/S/DECO/SRLBES.webp",
  "SRLBGR.webp": "/assets/hgi-assets/Glass/S/DECO/SRLBGR.webp",
  "SRLBSA.webp": "/assets/hgi-assets/Glass/S/DECO/SRLBSA.webp",
  "SRLBSI.webp": "/assets/hgi-assets/Glass/S/DECO/SRLBSI.webp",
  "SRLBTA.webp": "/assets/hgi-assets/Glass/S/DECO/SRLBTA.webp",
  "SRLBWH.webp": "/assets/hgi-assets/Glass/S/DECO/SRLBWH.webp",
  "SS5L.webp": "/assets/hgi-assets/Glass/S/DECO/SS5L.webp",
  "SS9INT.webp": "/assets/hgi-assets/Glass/S/DECO/SS9INT.webp",
  "SS9INTL.webp": "/assets/hgi-assets/Glass/S/DECO/SS9INTL.webp",
  "SSRLB9.webp": "/assets/hgi-assets/Glass/S/DECO/SSRLB9.webp",
  "SSV9.webp": "/assets/hgi-assets/Glass/S/DECO/SSV9.webp",
  "STOP.webp": "/assets/hgi-assets/Glass/S/DECO/STOP.webp",
  "SVAP.webp": "/assets/hgi-assets/Glass/S/DECO/SVAP.webp",
  "SVIL.webp": "/assets/hgi-assets/Glass/S/DECO/SVIL.webp",
  "SAT/SATClear.webp": "/assets/hgi-assets/Glass/SAT/SATClear.webp",
  "SAT/SATClearLowE.webp": "/assets/hgi-assets/Glass/SAT/SATClearLowE.webp",
  "SAT/SATGraceNickel.webp": "/assets/hgi-assets/Glass/SAT/SATGraceNickel.webp",
  "SAT/SATGracePatina.webp": "/assets/hgi-assets/Glass/SAT/SATGracePatina.webp",
  "SAT/SATLaurel.webp": "/assets/hgi-assets/Glass/SAT/SATLaurel.webp",
  "SWGRAPA.webp": "/assets/hgi-assets/Glass/SW/SWGRAPA.webp",
  "SWGRC.webp": "/assets/hgi-assets/Glass/SW/SWGRC.webp",
  "SWGWH.webp": "/assets/hgi-assets/Glass/SW/SWGWH.webp",
  "SWHEIBB.webp": "/assets/hgi-assets/Glass/SW/SWHEIBB.webp",
  "SWHEINI.webp": "/assets/hgi-assets/Glass/SW/SWHEINI.webp",
  "SWMIC.webp": "/assets/hgi-assets/Glass/SW/SWMIC.webp",
  "SWNOUNI.webp": "/assets/hgi-assets/Glass/SW/SWNOUNI.webp",
  "SWNOUPA.webp": "/assets/hgi-assets/Glass/SW/SWNOUPA.webp",
  "SWREN.webp": "/assets/hgi-assets/Glass/SW/SWREN.webp",
  "SWTS.webp": "/assets/hgi-assets/Glass/S/DECO/SWTS.webp",
}

const glassOverlayAssetUrl = (folder: string, fileName: string) =>
  fileName.startsWith('/assets/hgi-assets/')
    ? fileName
    : glassPreviewAssets[`${folder}/${fileName}`] ?? glassPreviewAssets[fileName] ?? ''

const glassThumbnailOptions = [
  { id: 'ashbury', name: 'Ashbury', image: '/assets/glass/thumbnails/Ashbury.webp' },
  { id: 'bay-point', name: 'Bay Point', image: '/assets/glass/thumbnails/Bay Point.webp' },
  { id: 'berkley', name: 'Berkley', image: '/assets/glass/thumbnails/Berkley.webp' },
  { id: 'blanca', name: 'Blanca', image: '/assets/glass/thumbnails/Blanca.webp' },
  { id: 'blinds', name: 'Blinds', image: '/assets/glass/thumbnails/Blinds.webp' },
  { id: 'briselle', name: 'Briselle', image: '/assets/glass/thumbnails/Decorative.webp' },
  { id: 'bristol', name: 'Bristol', image: '/assets/glass/thumbnails/Bristol.webp' },
  { id: 'cadence', name: 'Cadence', image: '/assets/glass/thumbnails/Cadence.webp' },
  { id: 'calandra', name: 'Calandra', image: '/assets/glass/thumbnails/Calandra.webp' },
  { id: 'carrollton', name: 'Carrollton', image: '/assets/glass/thumbnails/Carrollton.webp' },
  { id: 'catalina', name: 'Catalina', image: '/assets/glass/thumbnails/Catalina.webp' },
  { id: 'chinchilla', name: 'Chinchilla', image: '/assets/glass/thumbnails/Chinchilla.webp' },
  { id: 'clear', name: 'Clear Glass - Standard', image: '/assets/glass/thumbnails/Clear-option.webp' },
  { id: 'clear-low-e', name: 'Clear Glass - Low-E', image: '/assets/glass/thumbnails/Clear-option.webp' },
  { id: 'clic', name: 'CLIC', image: '/assets/glass/thumbnails/CLIC.webp' },
  { id: 'cobblestone', name: 'Cobblestone', image: '/assets/glass/thumbnails/Cobblestone.webp' },
  { id: 'courtyard', name: 'Courtyard', image: '/assets/glass/thumbnails/Courtyard.webp' },
  { id: 'contg', name: 'CONTG', image: '/assets/glass/thumbnails/CONTG.webp' },
  { id: 'crosswalk', name: 'Crosswalk', image: '/assets/glass/thumbnails/Crosswalk.webp' },
  { id: 'cubed', name: 'Cubed', image: '/assets/glass/thumbnails/Cubed.webp' },
  { id: 'cumulus', name: 'Cumulus', image: '/assets/glass/thumbnails/Cumulus.webp' },
  { id: 'cyndi', name: 'Cyndi', image: '/assets/glass/thumbnails/Cyndi.webp' },
  { id: 'decorative', name: 'Decorative', image: '/assets/glass/thumbnails/Decorative.webp' },
  { id: 'dorian', name: 'Dorian', image: '/assets/glass/thumbnails/DORIAN.webp' },
  { id: 'dutchcraft', name: 'Dutchcraft', image: '/assets/glass/thumbnails/Dutchcraft.webp' },
  { id: 'edgewood', name: 'Edgewood', image: '/assets/glass/thumbnails/Edgewood.webp' },
  { id: 'elegant', name: 'Elegant', image: '/assets/glass/thumbnails/Elegant.webp' },
  { id: 'empire', name: 'Empire', image: '/assets/glass/thumbnails/Empire.webp' },
  { id: 'entropy', name: 'Entropy', image: '/assets/glass/thumbnails/Entropy.webp' },
  { id: 'extg', name: 'EXTG', image: '/assets/glass/thumbnails/EXTG.webp' },
  { id: 'flatg', name: 'FLATG', image: '/assets/glass/thumbnails/FLATG.webp' },
  { id: 'fragrance', name: 'Fragrance', image: '/assets/glass/thumbnails/Fragrance.webp' },
  { id: 'frosted', name: 'Frosted', image: '/assets/glass/thumbnails/Frosted.webp' },
  { id: 'garrison', name: 'Garrison', image: '/assets/glass/thumbnails/Decorative.webp' },
  { id: 'geneva', name: 'Geneva', image: '/assets/glass/thumbnails/Geneva.webp' },
  { id: 'grace', name: 'Grace', image: '/assets/glass/thumbnails/Grace.webp' },
  { id: 'heirlooms', name: 'Heirlooms', image: '/assets/glass/thumbnails/Heirlooms.webp' },
  { id: 'high-point', name: 'High Point', image: '/assets/glass/thumbnails/High Point.webp' },
  { id: 'jacinto', name: 'Jacinto', image: '/assets/glass/thumbnails/Jacinto.webp' },
  { id: 'jameston', name: 'Jameston', image: '/assets/glass/thumbnails/Jameston.webp' },
  { id: 'laurel', name: 'Laurel', image: '/assets/glass/thumbnails/Laurel.webp' },
  { id: 'lazarus', name: 'Lazarus', image: '/assets/glass/thumbnails/Lazarus.webp' },
  { id: 'leland', name: 'Leland', image: '/assets/glass/thumbnails/Leland.webp' },
  { id: 'lexington', name: 'Lexington', image: '/assets/glass/thumbnails/Lexington.webp' },
  { id: 'linen', name: 'Linen', image: '/assets/glass/thumbnails/Linen.webp' },
  { id: 'london', name: 'London', image: '/assets/glass/thumbnails/London.webp' },
  { id: 'low-e', name: 'Low-E', image: '/assets/glass/thumbnails/LowE.webp' },
  { id: 'low-e-plus', name: 'Low-E+', image: '/assets/glass/thumbnails/LowE+.webp' },
  { id: 'low-e-366', name: 'Low-E 366', image: '/assets/glass/thumbnails/LowE366.webp' },
  { id: 'majestic', name: 'Majestic', image: '/assets/glass/thumbnails/Majestic.webp' },
  { id: 'margate', name: 'Margate', image: '/assets/glass/thumbnails/Margate.webp' },
  { id: 'metro', name: 'Metro', image: '/assets/glass/thumbnails/Metro.webp' },
  { id: 'micro-granite', name: 'Micro Granite', image: '/assets/glass/thumbnails/Micro Granite.webp' },
  { id: 'mistify', name: 'Mistify', image: '/assets/glass/thumbnails/Mistify.webp' },
  { id: 'mohave', name: 'Mohave', image: '/assets/glass/thumbnails/Mohave.webp' },
  { id: 'monterey', name: 'Monterey', image: '/assets/glass/thumbnails/Monterey.webp' },
  { id: 'neo', name: 'Neo', image: '/assets/glass/thumbnails/Neo.webp' },
  { id: 'nouveau', name: 'Nouveau', image: '/assets/glass/thumbnails/Nouveau.webp' },
  { id: 'oak-park', name: 'Oak Park', image: '/assets/glass/thumbnails/Oak Park.webp' },
  { id: 'ocean-caming', name: 'Ocean Caming', image: '/assets/glass/thumbnails/Ocean Caming.webp' },
  { id: 'ovation', name: 'Ovation', image: '/assets/glass/thumbnails/Ovation.webp' },
  { id: 'paris', name: 'Paris', image: '/assets/glass/thumbnails/Paris.webp' },
  { id: 'pembrook', name: 'Pembrook', image: '/assets/glass/thumbnails/Pembrook.webp' },
  { id: 'prestige', name: 'Prestige', image: '/assets/glass/thumbnails/Prestige.webp' },
  { id: 'privacy', name: 'Private Lites', image: '/assets/glass/thumbnails/Private Lites.webp' },
  { id: 'rain', name: 'Rain', image: '/assets/glass/thumbnails/Rain.webp' },
  { id: 'renewed-impressions', name: 'Renewed Impressions', image: '/assets/glass/thumbnails/Renewed Impressions.webp' },
  { id: 'retro', name: 'Retro', image: '/assets/glass/thumbnails/Retro.webp' },
  { id: 'rill', name: 'Rill', image: '/assets/glass/thumbnails/Decorative.webp' },
  { id: 'riverwood', name: 'Riverwood', image: '/assets/glass/thumbnails/Riverwood.webp' },
  { id: 'sterling', name: 'Sterling', image: '/assets/glass/thumbnails/Sterling.webp' },
  { id: 'topaz', name: 'Topaz', image: '/assets/glass/thumbnails/Topaz.webp' },
  { id: 'vapor', name: 'Vapor', image: '/assets/glass/thumbnails/Vapor.webp' },
  { id: 'vilano', name: 'Vilano', image: '/assets/glass/thumbnails/Vilano.webp' },
  { id: 'vincraft', name: 'Vincraft', image: '/assets/glass/thumbnails/VINCRAFT.webp' },
  { id: 'waterside', name: 'Waterside', image: '/assets/glass/thumbnails/Waterside.webp' },
  { id: 'wyngate', name: 'Wyngate', image: '/assets/glass/thumbnails/Wyngate.webp' },
]

const normalizeThumbnailName = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '')

export const glassSelectionThumbnail = (name: string) => {
  const normalizedFullName = normalizeThumbnailName(name)
  const exactVariant = variantThumbnailOptions.find((option) =>
    normalizeThumbnailName(option.id) === normalizedFullName
      || normalizeThumbnailName(option.name) === normalizedFullName,
  )
  if (exactVariant) return exactVariant.image

  const baseName = name.split(/\s+[–-]\s+/)[0]
  const normalizedName = normalizeThumbnailName(baseName)
  const alias = normalizedName.startsWith('miniblinds')
    ? 'blinds'
    : normalizedName.startsWith('clic')
      ? 'clic'
      : normalizedName
  return glassThumbnailOptions.find((option) =>
    normalizeThumbnailName(option.id) === alias || normalizeThumbnailName(option.name) === alias,
  )?.image
}

const cr14Overlays: Record<string, string> = {
  clear: 'CR14BLA.webp',
  'cr14-divided-lites': '/assets/hgi-assets/Glass/CR14/CR14DL - CRAFTSMAN DIVIDED LITES.webp',
  cobblestone: 'CR14COB.webp',
  dutchcraft: 'CR14DUT.webp',
  leland: 'CR14LEL.webp',
  'oak-park': 'CR14OAK.webp',
  paris: 'CR14PAR.webp',
  rain: 'CR14RAI.webp',
  topaz: 'CR14TOP.webp',
}

const cr14plOverlays: Record<string, string> = {
  clear: '/assets/hgi-assets/Glass/CR14PL/Blanca.webp',
  blanca: '/assets/hgi-assets/Glass/CR14PL/Blanca.webp',
  'cr14-divided-lites': '/assets/hgi-assets/Glass/CR14PL/CR14DL - CRAFTSMAN DIVIDED LITES.webp',
  baroque: '/assets/hgi-assets/Glass/CR14PL/Baroque.webp',
  'bay-point': '/assets/hgi-assets/Glass/CR14PL/CR14PL - Baypoint.webp',
  chinchilla: '/assets/hgi-assets/Glass/CR14PL/Chinchilla.webp',
  courtyard: '/assets/hgi-assets/Glass/CR14PL/CR14PL - Courtyard.webp',
  crosswalk: '/assets/hgi-assets/Glass/CR14PL/CR14PL - Crosswalk.webp',
  'cr14pl-dorian': '/assets/hgi-assets/Glass/CR14PL/CR14PL - Dorian.webp',
  edgewood: '/assets/hgi-assets/Glass/CR14PL/CR14PL - Edgewood.webp',
  garrison: '/assets/hgi-assets/Glass/CR14PL/CR14PL - Garrison.webp',
  laurel: '/assets/hgi-assets/Glass/CR14PL/CR14PL - Laurel.webp',
  margate: '/assets/hgi-assets/Glass/CR14PL/CR14PL - Margate.webp',
  mistify: '/assets/hgi-assets/Glass/CR14PL/CR14PL - Mistify.webp',
  'cr14pl-monterey': '/assets/hgi-assets/Glass/CR14PL/CR14PL - Monterey.webp',
  'oak-park': '/assets/hgi-assets/Glass/CR14PL/CR14PL - Oakpark.webp',
  paris: '/assets/hgi-assets/Glass/CR14PL/CR14PL - Paris.webp',
  pembrook: '/assets/hgi-assets/Glass/CR14PL/CR14PL - Pembrook.webp',
  rill: '/assets/hgi-assets/Glass/CR14PL/CR14PL - Rill.webp',
  riverwood: '/assets/hgi-assets/Glass/CR14PL/CR14PL - Riverwood.webp',
  topaz: '/assets/hgi-assets/Glass/CR14PL/CR14PL - Topaz.webp',
  vilano: '/assets/hgi-assets/Glass/CR14PL/CR14PL - Vilano.webp',
  cumulus: '/assets/hgi-assets/Glass/CR14PL/Cumulus.webp',
  'double-water': '/assets/hgi-assets/Glass/CR14PL/Double Water.webp',
  'micro-granite': '/assets/hgi-assets/Glass/CR14PL/Microgranite.webp',
  rain: '/assets/hgi-assets/Glass/CR14PL/Rain.webp',
  streamed: '/assets/hgi-assets/Glass/CR14PL/Streamed.webp',
  vapor: '/assets/hgi-assets/Glass/CR14PL/Vapor.webp',
  vincraft: '/assets/hgi-assets/Glass/CR14PL/Vincraft.webp',
  'wide-reed': '/assets/hgi-assets/Glass/CR14PL/Widereed.webp',
  wyngate: '/assets/hgi-assets/Glass/CR14PL/Wyngate.webp',
}

const f848Overlays: Record<string, string> = {
  berkley: 'F848BER.webp',
  blanca: 'F848BLA.webp',
  cadence: 'F848CAD.webp',
  calandra: 'F848CAL.webp',
  carrollton: 'F848CAR.webp',
  chinchilla: 'F848CHI.webp',
  courtyard: 'F848COU.webp',
  crosswalk: 'F848CRO.webp',
  cumulus: 'F848CUM.webp',
  'dorian-nickel': 'F848DORNI.webp',
  'dorian-patina': 'F848DORPA.webp',
  'elegant-black-white': 'F848ELEBW.webp',
  'elegant-nickel': 'F848ELENI.webp',
  'elegant-patina': 'F848ELEPA.webp',
  empire: 'F848EMP.webp',
  clear: 'F848F10.webp',
  geneva: 'F848GEN.webp',
  'grace-patina': 'F848GRAPA.webp',
  'heirlooms-brass': 'F848HEIBB.webp',
  'heirlooms-nickel': 'F848HEINI.webp',
  'high-point': 'F848HIG.webp',
  jacinto: 'F848JAC.webp',
  linen: 'F848LIN.webp',
  'majestic-nickel': 'F848MAJNI.webp',
  margate: 'F848MAR.webp',
  metro: 'F848MET.webp',
  'micro-granite': 'F848MIC.webp',
  'monterey-patina': 'F848MONPA.webp',
  neo: 'F848NEO.webp',
  'nouveau-nickel': 'F848NOUNI.webp',
  'nouveau-patina': 'F848NOUPA.webp',
  'oak-park': 'F848OAK.webp',
  paris: 'F848PAR.webp',
  prestige: 'F848PRE.webp',
  streamed: '/assets/hgi-assets/Glass/CR14PL/Streamed.webp',
  topaz: 'F848TOP.webp',
  vapor: 'F848VAP.webp',
  vilano: 'F848VIL.webp',
  waterside: 'F848WAT.webp',
}

const foOverlays: Record<string, string> = {
  cadence: 'FOCAD.webp',
  clear: 'FOFOCL.webp',
  'grace-nickel': 'FOGRANI.webp',
  'grace-patina': 'FOGRAPA.webp',
  'heirlooms-brass': 'FOHEIBB.webp',
  'heirlooms-nickel': 'FOHEINI.webp',
  'nouveau-nickel': 'FONOUNI.webp',
  'nouveau-patina': 'FONOUPA.webp',
}

const qaOverlays: Record<string, string> = {
  'qa-clear-qacl': 'QAQACL.webp',
  'grace-nickel': 'QAGRANI.webp',
  'grace-patina': 'QAGRAPA.webp',
  'nouveau-nickel': 'QANOUNI.webp',
  'nouveau-patina': 'QANOUPA.webp',
  pembrook: 'QAPEM.webp',
  riverwood: 'QARIV.webp',
  vincraft: 'QAVIN.webp',
}

const caOverlays: Record<string, string> = {
  'ca-grace-nickel': '/assets/hgi-assets/Glass/CA/CAGRANI.webp',
  'ca-grace-patina': '/assets/hgi-assets/Glass/CA/CAGRAPA.webp',
  'ca-heirloom-brass': '/assets/hgi-assets/Glass/CA/CAHEIRBRA.webp',
  'ca-heirloom-nickel': '/assets/hgi-assets/Glass/CA/CAHEIRNI.webp',
}

const threeLtOverlays: Record<string, string> = {
  chinchilla: '/assets/hgi-assets/Glass/RETRO/3LTCHI.webp',
  clear: '/assets/hgi-assets/Glass/RETRO/3LTCLE.webp',
  'clear-low-e': '/assets/hgi-assets/Glass/RETRO/3LTCLE.webp',
  cubed: '/assets/hgi-assets/Glass/RETRO/3LTCUB.webp',
  frosted: '/assets/hgi-assets/Glass/RETRO/3LTFRO.webp',
  rain: '/assets/hgi-assets/Glass/RETRO/3LTRAI.webp',
}

const threeStepOverlays: Record<string, string> = {
  chinchilla: '/assets/hgi-assets/Glass/RETRO/3STEPCHI.webp',
  clear: '/assets/hgi-assets/Glass/RETRO/3STEPCLE.webp',
  'clear-low-e': '/assets/hgi-assets/Glass/RETRO/3STEPCLE.webp',
  cubed: '/assets/hgi-assets/Glass/RETRO/3STEPCUB.webp',
  frosted: '/assets/hgi-assets/Glass/RETRO/3STEPFRO.webp',
  rain: '/assets/hgi-assets/Glass/RETRO/3STEPRAI.webp',
}

const fourLtOverlays: Record<string, string> = {
  chinchilla: '/assets/hgi-assets/Glass/RETRO/4LTCHI.webp',
  clear: '/assets/hgi-assets/Glass/RETRO/4LTCLE.webp',
  'clear-low-e': '/assets/hgi-assets/Glass/RETRO/4LTCLE.webp',
  cubed: '/assets/hgi-assets/Glass/RETRO/4LTCUB.webp',
  frosted: '/assets/hgi-assets/Glass/RETRO/4LTFRO.webp',
  rain: '/assets/hgi-assets/Glass/RETRO/4LTRAI.webp',
}

const fiveLtOverlays: Record<string, string> = {
  chinchilla: '/assets/hgi-assets/Glass/RETRO/5LTCHI.webp',
  clear: '/assets/hgi-assets/Glass/RETRO/5LTCLE.webp',
  'clear-low-e': '/assets/hgi-assets/Glass/RETRO/5LTCLE.webp',
  cubed: '/assets/hgi-assets/Glass/RETRO/5LTCUB.webp',
  frosted: '/assets/hgi-assets/Glass/RETRO/5LTFRO.webp',
  rain: '/assets/hgi-assets/Glass/RETRO/5LTRAI.webp',
}

const f2Overlays: Record<string, string> = {
  clear: '/assets/hgi-assets/Glass/F2/F2.webp',
  frosted: '/assets/hgi-assets/Glass/F2/F2FRO.webp',
}

const f3Overlays: Record<string, string> = {
  clear: '/assets/hgi-assets/Glass/F3/F3.webp',
  frosted: '/assets/hgi-assets/Glass/F3/F3FRO.webp',
}

const f4Overlays: Record<string, string> = {
  clear: '/assets/hgi-assets/Glass/F/CLEAR STOCK/FF10.webp',
}

const frtOverlays: Record<string, string> = {
  'frt-clear-f17rt': '/assets/hgi-assets/Glass/FRT/FRT Glass.webp',
}

const f764Overlays: Record<string, string> = {
  chinchilla: '/assets/hgi-assets/Glass/RETRO/F764CHI.webp',
  clear: '/assets/hgi-assets/Glass/RETRO/F764CLE.webp',
  'clear-low-e': '/assets/hgi-assets/Glass/RETRO/F764CLE.webp',
  cubed: '/assets/hgi-assets/Glass/RETRO/F764CUB.webp',
  frosted: '/assets/hgi-assets/Glass/RETRO/F764FRO.webp',
  rain: '/assets/hgi-assets/Glass/RETRO/F764RAI.webp',
}

const hrtOverlays: Record<string, string> = {
  'hrt-clear-s11rt': '/assets/hgi-assets/Glass/HRT/HRT.webp',
  'hrt-nouveau-nickel': '/assets/hgi-assets/Glass/HRT/HRTNouveaNickel.webp',
  'hrt-nouveau-patina': '/assets/hgi-assets/Glass/HRT/HRTNouveaPatina.webp',
}

const nOverlays: Record<string, string> = {
  'n-clear-ncl': '/assets/hgi-assets/Glass/F/CLEAR STOCK/FF10.webp',
  'heirlooms-brass': '/assets/hgi-assets/Glass/N/NHeirloomsBrass.webp',
  'heirlooms-nickel': '/assets/hgi-assets/Glass/N/NHeirloomsNickel.webp',
  'nouveau-nickel': '/assets/hgi-assets/Glass/N/NNouveaNickel.webp',
  'nouveau-patina': '/assets/hgi-assets/Glass/N/NNouveaPatina.webp',
  rain: '/assets/hgi-assets/Glass/F/DECO/FRAI.webp',
  streamed: '/assets/hgi-assets/Glass/CR14PL/Streamed.webp',
}

const satOverlays: Record<string, string> = {
  'sat-clear-nonstock': 'SATClear.webp',
  'grace-nickel': 'SATGraceNickel.webp',
  'grace-patina': 'SATGracePatina.webp',
  laurel: 'SATLaurel.webp',
  rain: '/assets/hgi-assets/Glass/F/DECO/FRAI.webp',
}

const s2Overlays: Record<string, string> = {
  clear: '/assets/hgi-assets/Glass/F/CLEAR STOCK/FF10.webp',
}

const s3Overlays: Record<string, string> = {
  clear: '/assets/hgi-assets/Glass/F/CLEAR STOCK/FF10.webp',
}

const s4Overlays: Record<string, string> = {
  clear: '/assets/hgi-assets/Glass/F/CLEAR STOCK/FF10.webp',
}

const soOverlays: Record<string, string> = {
  cadence: 'SOCAD.webp',
  'so-clear-nonstock': '/assets/hgi-assets/Glass/FO/FOFOCL.webp',
  'so-clear-small-no-coating': '/assets/hgi-assets/Glass/FO/FOFOCL.webp',
  'so-clear-small-low-e': '/assets/hgi-assets/Glass/FO/FOFOCL.webp',
  'elegant-nickel': 'SOELENI.webp',
  'elegant-patina': 'SOELEPA.webp',
  'grace-nickel': 'SOGRC.webp',
  'heirlooms-brass': 'SOHEIBB.webp',
  'heirlooms-nickel': 'SOHEINI.webp',
  jameston: 'SOJAM.webp',
  laurel: 'SOLAU.webp',
  'nouveau-nickel': 'SONOUNI.webp',
  'nouveau-patina': 'SONOUPA.webp',
  rain: 'SORAI.webp',
  'renewed-impressions': 'SOREN.webp',
}

const sOverlays: Record<string, string> = {
  baroque: '/assets/hgi-assets/Glass/CR14PL/Baroque.webp',
  berkley: 'SBER.webp',
  blanca: 'SBLA.webp',
  bristol: 'SBRI.webp',
  chinchilla: 'SCHI.webp',
  cobblestone: 'SCOB.webp',
  courtyard: 'SCOU.webp',
  crosswalk: 'SCRO.webp',
  cumulus: 'SCUM.webp',
  'double-water': '/assets/hgi-assets/Glass/CR14PL/Double Water.webp',
  'dorian-nickel': 'SDORNI.webp',
  'dorian-patina': 'SDORPA.webp',
  dutchcraft: 'SDUT.webp',
  edgewood: 'SEDG.webp',
  'elegant-black-white': 'SELEBW.webp',
  'elegant-nickel': 'SELENI.webp',
  'elegant-patina': 'SELEPA.webp',
  empire: 'SEMP.webp',
  's-clear-no-grids': 'SF5.webp',
  's-clear-grids': '/assets/hgi-assets/Glass/S/INTERNAL GRIDS/SINT9LWH.webp',
  's-clear-s5': 'SF5.webp',
  's-clear-s5l': 'SF5L.webp',
  's-clear-s9': '/assets/hgi-assets/Glass/SDL/S9LXX.webp',
  's-clear-s9int': 'SS9INT.webp',
  's-clear-s9intl': 'SS9INTL.webp',
  's-clear-sv6': 'SSV9.webp',
  's-clear-nonstock': 'SF5.webp',
  clear: 'SF10.webp',
  'grace-nickel': 'SGRA.webp',
  'heirlooms-brass': 'SHEIBB.webp',
  'heirlooms-nickel': 'SHEINI.webp',
  jacinto: 'SJAC.webp',
  jameston: 'SJAM.webp',
  laurel: 'SLAU.webp',
  lazarus: 'SLAZ.webp',
  leland: 'SLEL.webp',
  lexington: 'SLEX.webp',
  linen: 'SLIN.webp',
  london: 'SLON.webp',
  'majestic-patina': 'SMAJ.webp',
  margate: 'SMAR.webp',
  metro: 'SMET.webp',
  'micro-granite': 'SMIC.webp',
  mohave: 'SMOH.webp',
  'monterey-nickel': 'SMONNI.webp',
  'monterey-patina': 'SMONPA.webp',
  neo: 'SNEO.webp',
  'nouveau-nickel': 'SNOUNI.webp',
  'nouveau-patina': 'SNOUPA.webp',
  'oak-park': 'SOAK.webp',
  paris: 'SPAR.webp',
  pembrook: 'SPEM.webp',
  prestige: 'SPRE.webp',
  rain: 'SRAI.webp',
  'renewed-impressions': 'SREN.webp',
  riverwood: 'SRIV.webp',
  streamed: '/assets/hgi-assets/Glass/CR14PL/Streamed.webp',
  's-blinds-srlb-white': 'SRLBWH.webp',
  's-blinds-srlb-tan': 'SRLBTA.webp',
  's-blinds-srlb-espresso': 'SRLBES.webp',
  's-blinds-srlb-gray': 'SRLBGR.webp',
  's-blinds-srlb-silver': 'SRLBSI.webp',
  's-blinds-srlb9-white': 'SSRLB9.webp',
  's-blinds-sfrlb-white': 'SRLBWH.webp',
  's-blinds-sfrlb-tan': 'SRLBTA.webp',
  's-blinds-sfrlb-espresso': 'SRLBES.webp',
  's-blinds-sfrlb-gray': 'SRLBGR.webp',
  's-blinds-sfrlb-silver': 'SRLBSI.webp',
  's-blinds-sfrlb9-white': 'SSRLB9.webp',
  's-clic-nogrid': 'SF5.webp',
  's-clic-ext-4l': '/assets/hgi-assets/Glass/SDL/S4LXX.webp',
  's-clic-ext-9l': '/assets/hgi-assets/Glass/SDL/S9LXX.webp',
  topaz: 'STOP.webp',
  vapor: 'SVAP.webp',
  'wide-reed': '/assets/hgi-assets/Glass/CR14PL/Widereed.webp',
  vilano: 'SVIL.webp',
  waterside: 'SWTS.webp',
}

const fOverlays: Record<string, string> = {
  ashbury: 'FASH.webp',
  'bay-point': 'FBAY.webp',
  blanca: 'FBLA.webp',
  bristol: 'FBRI.webp',
  cadence: 'FCAD.webp',
  calandra: 'FCAL.webp',
  carrollton: 'FCAR.webp',
  cobblestone: 'FCOB.webp',
  courtyard: 'FCOU.webp',
  crosswalk: 'FCRO.webp',
  cumulus: 'FCUM.webp',
  'dorian-nickel': 'FDORNI.webp',
  'dorian-patina': 'FDORPA.webp',
  dutchcraft: 'FDUT.webp',
  edgewood: 'FEDG.webp',
  'elegant-black-white': 'FELEBW.webp',
  'elegant-nickel': 'FELEPN.webp',
  'elegant-patina': 'FELEPA.webp',
  entropy: 'FENT.webp',
  clear: 'FF10.webp',
  'f-clear-f10': 'FF10.webp',
  'f-clear-f10l': 'FF10L.webp',
  'f-clear-no-grids': 'FF10.webp',
  'f-clear-grids': 'FF15WH.webp',
  'f-clear-f15': 'FF15WH.webp',
  'f-clear-f15int': '/assets/hgi-assets/Glass/F/INTERNAL GRIDS/FINT15LWH.webp',
  'f-clear-f15intl': '/assets/hgi-assets/Glass/F/INTERNAL GRIDS/FINT15LWH.webp',
  'f-clear-fpraint': 'FFPRAINT.webp',
  'f-clear-ften': 'FFTEN.webp',
  'f-clear-nonstock': 'FF10.webp',
  'f-clic-nogrid': 'FF10.webp',
  'f-clic-ext-8l': '/assets/hgi-assets/Glass/SDL/F8LXX.webp',
  'f-clic-ext-10l': '/assets/hgi-assets/Glass/SDL/F10LXX.webp',
  'f-clic-ext-15l': '/assets/hgi-assets/Glass/SDL/F15LXX.webp',
  'f-f10l': 'FF10L.webp',
  'f-f15wh': 'FF15WH.webp',
  'f-prairie-internal': 'FFPRAINT.webp',
  'f-blinds-15': 'FFRLB15.webp',
  'f-blinds-frlb-white': 'FRLBWH.webp',
  'f-blinds-frlb-tan': 'FRLBTA.webp',
  'f-blinds-frlb-espresso': 'FRLBES.webp',
  'f-blinds-frlb-gray': 'FRLBGR.webp',
  'f-blinds-frlb-silver': 'FRLBSI.webp',
  'f-blinds-frlb15-white': 'FFRLB15.webp',
  'f-ten-lite': 'FFTEN.webp',
  geneva: 'FGEN.webp',
  'grace-nickel': 'FGRA.webp',
  'heirlooms-brass': 'FHEIBB.webp',
  'heirlooms-nickel': 'FHEINI.webp',
  'high-point': 'FHIG.webp',
  jacinto: 'FJAC.webp',
  jameston: 'FJAM.webp',
  laurel: 'FLAU.webp',
  lazarus: 'FLAZ.webp',
  leland: 'FLEL.webp',
  lexington: 'FLEX.webp',
  linen: 'FLIN.webp',
  london: 'FLON.webp',
  'f-madison': 'FMAD.webp',
  'majestic-patina': 'FMAJ.webp',
  'majestic-nickel': 'FMAJNI.webp',
  'micro-granite': 'FMIC.webp',
  mohave: 'FMOH.webp',
  'monterey-patina': 'FMONPA.webp',
  'monterey-nickel': 'FMONSN.webp',
  'nouveau-nickel': 'FNOUNI.webp',
  'nouveau-patina': 'FNOUPA.webp',
  'oak-park': 'FOAK.webp',
  ovation: 'FOVA.webp',
  paris: 'FPAR.webp',
  pembrook: 'FPEM.webp',
  prestige: 'FPRE.webp',
  rain: 'FRAI.webp',
  'renewed-impressions': 'FREN.webp',
  riverwood: 'FRIV.webp',
  'blinds-espresso': 'FRLBES.webp',
  'blinds-gray': 'FRLBGR.webp',
  'blinds-sand': 'FRLBSA.webp',
  'blinds-silver': 'FRLBSI.webp',
  'blinds-tan': 'FRLBTA.webp',
  'blinds-white': 'FRLBWH.webp',
  steamed: 'FSTE.webp',
  topaz: 'FTOP.webp',
  vapor: 'FVAP.webp',
  vilano: 'FVIL.webp',
  waterside: 'FWTS.webp',
}

const f482Overlays: Record<string, string> = {
  'f48-clear-no-grids': '/assets/hgi-assets/Glass/F48/CLEAR STOCK/F48F10.webp',
  'f48-clear-grids': '/assets/hgi-assets/Glass/F48/INTERNAL GRIDS/F48INT12LWH.webp',
  'f48-clear-f1248': '/assets/hgi-assets/Glass/F48/CLEAR STOCK/F48F1248WH.webp',
  'f48-clear-f1248l': '/assets/hgi-assets/Glass/F48/INTERNAL GRIDS/F48INT12LWH.webp',
  'f48-clear-f648l': '/assets/hgi-assets/Glass/SDL/F648LXX.webp',
  'f48-clear-nonstock': '/assets/hgi-assets/Glass/F48/CLEAR STOCK/F48F10.webp',
  'f48-blinds-white': '/assets/hgi-assets/Glass/F48/DECO/F48FRLB48.webp',
  'f48-clic-nogrid': '/assets/hgi-assets/Glass/F48/CLEAR STOCK/F48F10.webp',
  'f48-clic-ext-12l': '/assets/hgi-assets/Glass/SDL/F4812LXX.webp',
  ashbury: '/assets/hgi-assets/Glass/F482/F482Ashbury.webp',
  baroque: '/assets/hgi-assets/Glass/CR14PL/Baroque.webp',
  berkley: '/assets/hgi-assets/Glass/F482/F482Berkley.webp',
  blanca: '/assets/hgi-assets/Glass/F48/DECO/F48BLA.webp',
  briselle: '/assets/hgi-assets/Glass/F482/F482Briselle.webp',
  cadence: '/assets/hgi-assets/Glass/F482/F482Cadence.webp',
  calandra: '/assets/hgi-assets/Glass/F482/F482Calandra.webp',
  chinchilla: '/assets/hgi-assets/Glass/F48/DECO/F48CHI.webp',
  courtyard: '/assets/hgi-assets/Glass/F482/F482Courtyard.webp',
  crosswalk: '/assets/hgi-assets/Glass/F482/F482Crosswalk.webp',
  cumulus: '/assets/hgi-assets/Glass/F48/DECO/F48CUM.webp',
  cyndi: '/assets/hgi-assets/Glass/F482/F482Cyndi.webp',
  'dorian-nickel': '/assets/hgi-assets/Glass/F482/F482Dorian.webp',
  'dorian-patina': '/assets/hgi-assets/Glass/F482/F482Dorian.webp',
  edgewood: '/assets/hgi-assets/Glass/F482/F482Edgewood.webp',
  'double-water': '/assets/hgi-assets/Glass/CR14PL/Double Water.webp',
  'elegant-black-white': '/assets/hgi-assets/Glass/F482/F482Elegant.webp',
  'elegant-nickel': '/assets/hgi-assets/Glass/F482/F482Elegant.webp',
  'elegant-patina': '/assets/hgi-assets/Glass/F482/F482Elegant.webp',
  empire: '/assets/hgi-assets/Glass/F482/F482Empire.webp',
  fragrance: '/assets/hgi-assets/Glass/F482/F482Fragrance.webp',
  garrison: '/assets/hgi-assets/Glass/F482/F482Garrison.webp',
  'grace-nickel': '/assets/hgi-assets/Glass/F482/F482Grace.webp',
  'grace-patina': '/assets/hgi-assets/Glass/F482/F482Grace.webp',
  'heirlooms-brass': '/assets/hgi-assets/Glass/F482/F482Heirlooms.webp',
  'heirlooms-nickel': '/assets/hgi-assets/Glass/F482/F482Heirlooms.webp',
  'high-point': '/assets/hgi-assets/Glass/F482/F482Highpoint.webp',
  jameston: '/assets/hgi-assets/Glass/F482/F482Jameston.webp',
  'majestic-nickel': '/assets/hgi-assets/Glass/F482/F482Majestic.webp',
  'majestic-patina': '/assets/hgi-assets/Glass/F482/F482Majestic.webp',
  margate: '/assets/hgi-assets/Glass/F482/F482Margate.webp',
  metro: '/assets/hgi-assets/Glass/F482/F482Metro.webp',
  'micro-granite': '/assets/hgi-assets/Glass/F48/DECO/F48MIC.webp',
  mistify: '/assets/hgi-assets/Glass/F482/F482Mistify.webp',
  mohave: '/assets/hgi-assets/Glass/F482/F482Mohave.webp',
  'monterey-nickel': '/assets/hgi-assets/Glass/F482/F482Monterey.webp',
  'monterey-patina': '/assets/hgi-assets/Glass/F482/F482Monterey.webp',
  neo: '/assets/hgi-assets/Glass/F482/F482Neo.webp',
  'nouveau-nickel': '/assets/hgi-assets/Glass/F482/F482Nouvea.webp',
  'nouveau-patina': '/assets/hgi-assets/Glass/F482/F482Nouvea.webp',
  'oak-park': '/assets/hgi-assets/Glass/F482/F482Oakpark.webp',
  paris: '/assets/hgi-assets/Glass/F482/F482Paris.webp',
  pembrook: '/assets/hgi-assets/Glass/F482/F482Pembrook.webp',
  prestige: '/assets/hgi-assets/Glass/F482/F482Prestige.webp',
  rain: '/assets/hgi-assets/Glass/F48/DECO/F48RAI.webp',
  rill: '/assets/hgi-assets/Glass/F482/F482Rill.webp',
  riverwood: '/assets/hgi-assets/Glass/F482/F482Riverwood.webp',
  sterling: '/assets/hgi-assets/Glass/F482/F482Sterling.webp',
  streamed: '/assets/hgi-assets/Glass/CR14PL/Streamed.webp',
  topaz: '/assets/hgi-assets/Glass/F482/F482Topaz.webp',
  vilano: '/assets/hgi-assets/Glass/F482/F482Vilano.webp',
  vincraft: '/assets/hgi-assets/Glass/F482/F482Vincraft.webp',
  vapor: '/assets/hgi-assets/Glass/F48/DECO/F48VAP.webp',
  waterside: '/assets/hgi-assets/Glass/F482/F482Waterside.webp',
  'wide-reed': '/assets/hgi-assets/Glass/CR14PL/Widereed.webp',
}

const f48Overlays: Record<string, string> = {
  clear: '/assets/hgi-assets/Glass/F48/CLEAR STOCK/F48F10.webp',
  'f48-clear-no-grids': '/assets/hgi-assets/Glass/F48/CLEAR STOCK/F48F10.webp',
  'clear-low-e': '/assets/hgi-assets/Glass/F48/CLEAR STOCK/F48F10.webp',
  'f48-clear-grids': '/assets/hgi-assets/Glass/F48/INTERNAL GRIDS/F48INT12LWH.webp',
  'f48-clear-f1248': '/assets/hgi-assets/Glass/F48/CLEAR STOCK/F48F1248WH.webp',
  'f48-clear-f1248l': '/assets/hgi-assets/Glass/F48/INTERNAL GRIDS/F48INT12LWH.webp',
  'f48-clear-f648l': '/assets/hgi-assets/Glass/SDL/F648LXX.webp',
  'f48-clear-nonstock': '/assets/hgi-assets/Glass/F48/CLEAR STOCK/F48F10.webp',
  'f48-blinds-white': '/assets/hgi-assets/Glass/F48/DECO/F48FRLB48.webp',
  'f48-clic-nogrid': '/assets/hgi-assets/Glass/F48/CLEAR STOCK/F48F10.webp',
  'f48-clic-ext-12l': '/assets/hgi-assets/Glass/SDL/F4812LXX.webp',
  ashbury: '/assets/hgi-assets/Glass/F48/DECO/F48ASH.webp',
  berkley: '/assets/hgi-assets/Glass/F48/DECO/F48BER.webp',
  blanca: '/assets/hgi-assets/Glass/F48/DECO/F48BLA.webp',
  briselle: '/assets/hgi-assets/Glass/F48/DECO/F48BRI.webp',
  cadence: '/assets/hgi-assets/Glass/F48/DECO/F48CAD.webp',
  calandra: '/assets/hgi-assets/Glass/F48/DECO/F48CAL.webp',
  carrollton: '/assets/hgi-assets/Glass/F48/DECO/F48CAR.webp',
  chinchilla: '/assets/hgi-assets/Glass/F48/DECO/F48CHI.webp',
  courtyard: '/assets/hgi-assets/Glass/F48/DECO/F48COU.webp',
  crosswalk: '/assets/hgi-assets/Glass/F48/DECO/F48CRO.webp',
  cumulus: '/assets/hgi-assets/Glass/F48/DECO/F48CUM.webp',
  cyndi: '/assets/hgi-assets/Glass/F482/F482Cyndi.webp',
  'dorian-nickel': '/assets/hgi-assets/Glass/F48/DECO/F48DORNI.webp',
  'dorian-patina': '/assets/hgi-assets/Glass/F48/DECO/F48DORPA.webp',
  edgewood: '/assets/hgi-assets/Glass/F48/DECO/F48EDG.webp',
  'elegant-black-white': '/assets/hgi-assets/Glass/F48/DECO/F48ELEBW.webp',
  'elegant-nickel': '/assets/hgi-assets/Glass/F48/DECO/F48ELENI.webp',
  'elegant-patina': '/assets/hgi-assets/Glass/F48/DECO/F48ELEPA.webp',
  empire: '/assets/hgi-assets/Glass/F48/DECO/F48EMP.webp',
  fragrance: '/assets/hgi-assets/Glass/F482/F482Fragrance.webp',
  garrison: '/assets/hgi-assets/Glass/F482/F482Garrison.webp',
  geneva: '/assets/hgi-assets/Glass/F48/DECO/F48GEN.webp',
  'grace-nickel': '/assets/hgi-assets/Glass/F48/DECO/F48GRA.webp',
  'grace-patina': '/assets/hgi-assets/Glass/F48/DECO/F48GRA.webp',
  'heirlooms-brass': '/assets/hgi-assets/Glass/F48/DECO/F48HEIBB.webp',
  'heirlooms-nickel': '/assets/hgi-assets/Glass/F48/DECO/F48HEINI.webp',
  'high-point': '/assets/hgi-assets/Glass/F48/DECO/F48HIG.webp',
  jacinto: '/assets/hgi-assets/Glass/F48/DECO/F48JAC.webp',
  jameston: '/assets/hgi-assets/Glass/F48/DECO/F48JAM.webp',
  linen: '/assets/hgi-assets/Glass/F48/DECO/F48LIN.webp',
  london: '/assets/hgi-assets/Glass/F48/DECO/F48LON.webp',
  'f-madison': '/assets/hgi-assets/Glass/F48/DECO/F48MAD.webp',
  margate: '/assets/hgi-assets/Glass/F48/DECO/F48MAR.webp',
  metro: '/assets/hgi-assets/Glass/F48/DECO/F48MET.webp',
  mistify: '/assets/hgi-assets/Glass/F482/F482Mistify.webp',
  'micro-granite': '/assets/hgi-assets/Glass/F48/DECO/F48MIC.webp',
  mohave: '/assets/hgi-assets/Glass/F48/DECO/F48MOH.webp',
  'monterey-nickel': '/assets/hgi-assets/Glass/F48/DECO/F48MONNI.webp',
  'monterey-patina': '/assets/hgi-assets/Glass/F48/DECO/F48MONPA.webp',
  neo: '/assets/hgi-assets/Glass/F48/DECO/F48NEO.webp',
  'nouveau-nickel': '/assets/hgi-assets/Glass/F48/DECO/F48NOUNI.webp',
  'nouveau-patina': '/assets/hgi-assets/Glass/F48/DECO/F48NOUPA.webp',
  'oak-park': '/assets/hgi-assets/Glass/F48/DECO/F48OAK.webp',
  paris: '/assets/hgi-assets/Glass/F48/DECO/F48PAR.webp',
  pembrook: '/assets/hgi-assets/Glass/F48/DECO/F48PEM.webp',
  prestige: '/assets/hgi-assets/Glass/F48/DECO/F48PRE.webp',
  rain: '/assets/hgi-assets/Glass/F48/DECO/F48RAI.webp',
  rill: '/assets/hgi-assets/Glass/F482/F482Rill.webp',
  riverwood: '/assets/hgi-assets/Glass/F48/DECO/F48RIV.webp',
  sterling: '/assets/hgi-assets/Glass/F482/F482Sterling.webp',
  streamed: '/assets/hgi-assets/Glass/CR14PL/Streamed.webp',
  topaz: '/assets/hgi-assets/Glass/F48/DECO/F48TOP.webp',
  vapor: '/assets/hgi-assets/Glass/F48/DECO/F48VAP.webp',
  vilano: '/assets/hgi-assets/Glass/F48/DECO/F48VIL.webp',
  vincraft: '/assets/hgi-assets/Glass/F482/F482Vincraft.webp',
  waterside: '/assets/hgi-assets/Glass/F48/DECO/F48WTS.webp',
  baroque: '/assets/hgi-assets/Glass/CR14PL/Baroque.webp',
  'double-water': '/assets/hgi-assets/Glass/CR14PL/Double Water.webp',
  'wide-reed': '/assets/hgi-assets/Glass/CR14PL/Widereed.webp',
}

const s836Overlays: Record<string, string> = {
  blanca: 'S836BLA.webp',
  chinchilla: 'S836CHI.webp',
  crosswalk: 'S836CRO.webp',
  courtyard: 'S836COU.webp',
  cumulus: 'S836CUM.webp',
  'dorian-nickel': 'S836DORNI.webp',
  'dorian-patina': 'S836DORPA.webp',
  'elegant-black-white': 'S836ELEBW.webp',
  'elegant-nickel': 'S836ELEPN.webp',
  'elegant-patina': 'S836ELEPA.webp',
  clear: 'S836F10.webp',
  'grace-nickel': 'S836GRA.webp',
  's836-blinds-h8rlb': 'S836H8RLB.webp',
  'heirlooms-brass': 'S836HEIBB.webp',
  'heirlooms-nickel': 'S836HEINI.webp',
  'majestic-patina': 'S836MAJPA.webp',
  margate: 'S836MAR.webp',
  mistify: '/assets/hgi-assets/Glass/CR14PL/CR14PL - Mistify.webp',
  'micro-granite': 'S836MIC.webp',
  mohave: 'S836MOH.webp',
  'nouveau-nickel': 'S836NOUNI.webp',
  'nouveau-patina': 'S836NOUPA.webp',
  'oak-park': '/assets/hgi-assets/Glass/F848/F848OAK.webp',
  paris: 'S836PAR.webp',
  rain: 'S836RAI.webp',
  'renewed-impressions': 'S836REN.webp',
  streamed: '/assets/hgi-assets/Glass/CR14PL/Streamed.webp',
  topaz: 'S836TOP.webp',
  vapor: 'S836VAP.webp',
  vilano: 'S836VIL.webp',
  waterside: 'S836WAT.webp',
}

const swOverlays: Record<string, string> = {
  'sw-clear-swg': 'SWGWH.webp',
  'grace-nickel': 'SWGRC.webp',
  'grace-patina': 'SWGRAPA.webp',
  'heirlooms-brass': 'SWHEIBB.webp',
  'heirlooms-nickel': 'SWHEINI.webp',
  laurel: '/assets/hgi-assets/Glass/S/DECO/SLAU.webp',
  'micro-granite': 'SWMIC.webp',
  'nouveau-nickel': 'SWNOUNI.webp',
  'nouveau-patina': 'SWNOUPA.webp',
  'renewed-impressions': 'SWREN.webp',
  'sw-rain-nogrid': '/assets/hgi-assets/Glass/SW/SW - Rain.webp',
  'sw-rain-5l': '/assets/hgi-assets/Glass/SW/SW - Rain 5LT.webp',
}

const variantThumbnailOptions = [
  { id: 'baroque', name: 'Baroque', image: '/assets/glass/thumbnails/Baroque.webp' },
  { id: 'cr14pl-dorian', name: 'Dorian', image: '/assets/glass/thumbnails/DORIAN.webp' },
  { id: 'cr14pl-monterey', name: 'Monterey', image: '/assets/glass/thumbnails/Monterey.webp' },
  { id: 'double-water', name: 'Double Water', image: '/assets/glass/thumbnails/CR14PL Double Water.webp' },
  { id: 'streamed', name: 'Streamed', image: '/assets/glass/thumbnails/Streamed.webp' },
  { id: 'wide-reed', name: 'Wide Reed', image: '/assets/glass/thumbnails/CR14PL Widereed.webp' },
  { id: 'cr14-divided-lites', name: 'Craftsman Divided Lites', image: '/assets/glass/thumbnails/CR14PL Craftsman Divided Lites.webp' },
  { id: 'ca-heirloom-brass', name: 'Heirloom - Brass', image: '/assets/glass/thumbnails/Heirlooms - Brass.webp' },
  { id: 'ca-heirloom-nickel', name: 'Heirloom - Nickel', image: '/assets/glass/thumbnails/Heirlooms - Nickel.webp' },
  { id: 'ca-grace-nickel', name: 'Grace - Nickel', image: '/assets/glass/thumbnails/Grace - Nickel.webp' },
  { id: 'ca-grace-patina', name: 'Grace - Patina', image: '/assets/glass/thumbnails/Grace - Patina.webp' },
  { id: 'dorian-nickel', name: 'Dorian - Nickel', image: '/assets/glass/thumbnails/Dorian - Nickel.webp' },
  { id: 'dorian-patina', name: 'Dorian - Patina', image: '/assets/glass/thumbnails/Dorian - Patina.webp' },
  { id: 'elegant-black-white', name: 'Elegant - Black/White', image: '/assets/glass/thumbnails/Elegant - Black_White.webp' },
  { id: 'elegant-nickel', name: 'Elegant - Nickel', image: '/assets/glass/thumbnails/Elegant - Nickel.webp' },
  { id: 'elegant-patina', name: 'Elegant - Patina', image: '/assets/glass/thumbnails/Elegant - Patina.webp' },
  { id: 'grace-nickel', name: 'Grace - Nickel', image: '/assets/glass/thumbnails/Grace - Nickel.webp' },
  { id: 'grace-patina', name: 'Grace - Patina', image: '/assets/glass/thumbnails/Grace - Patina.webp' },
  { id: 'heirlooms-brass', name: 'Heirlooms - Brass', image: '/assets/glass/thumbnails/Heirlooms - Brass.webp' },
  { id: 'heirlooms-nickel', name: 'Heirlooms - Nickel', image: '/assets/glass/thumbnails/Heirlooms - Nickel.webp' },
  { id: 'majestic-nickel', name: 'Majestic - Nickel', image: '/assets/glass/thumbnails/Majestic - Nickel.webp' },
  { id: 'majestic-patina', name: 'Majestic - Patina', image: '/assets/glass/thumbnails/Majestic - Patina.webp' },
  { id: 'monterey-nickel', name: 'Monterey - Nickel', image: '/assets/glass/thumbnails/Monterey - Nickel.webp' },
  { id: 'monterey-patina', name: 'Monterey - Patina', image: '/assets/glass/thumbnails/Monterey - Patina.webp' },
  { id: 'nouveau-nickel', name: 'Nouveau - Nickel', image: '/assets/glass/thumbnails/Nouveau - Nickel.webp' },
  { id: 'nouveau-patina', name: 'Nouveau - Patina', image: '/assets/glass/thumbnails/Nouveau - Patina.webp' },
  { id: 'hrt-nouveau-nickel', name: 'Nouveau - Nickel', image: '/assets/glass/thumbnails/Nouveau - Nickel.webp' },
  { id: 'hrt-nouveau-patina', name: 'Nouveau - Patina', image: '/assets/glass/thumbnails/Nouveau - Patina.webp' },
  { id: 'celestial', name: 'Celestial', image: '/assets/glass/thumbnails/Ocean Caming.webp' },
  { id: 'courtyard', name: 'Courtyard', image: '/assets/glass/thumbnails/Courtyard.webp' },
  { id: 'paris', name: 'Paris', image: '/assets/glass/thumbnails/Paris.webp' },
  { id: 'blinds-espresso', name: 'Blinds - Espresso', image: '/assets/glass/thumbnails/Blinds.webp' },
  { id: 'blinds-gray', name: 'Blinds - Gray', image: '/assets/glass/thumbnails/Blinds.webp' },
  { id: 'blinds-sand', name: 'Blinds - Sand', image: '/assets/glass/thumbnails/Blinds.webp' },
  { id: 'blinds-silver', name: 'Blinds - Silver', image: '/assets/glass/thumbnails/Blinds.webp' },
  { id: 'blinds-tan', name: 'Blinds - Tan', image: '/assets/glass/thumbnails/Blinds.webp' },
  { id: 'blinds-white', name: 'Blinds - White', image: '/assets/glass/thumbnails/Blinds.webp' },
  { id: 'f-f10l', name: 'F10L', image: '/assets/glass/thumbnails/Clear-option.webp' },
  { id: 'f-f15wh', name: 'F15 White Grid', image: '/assets/glass/thumbnails/Clear-option.webp' },
  { id: 'f-prairie-internal', name: 'Prairie Internal', image: '/assets/glass/thumbnails/Clear-option.webp' },
  { id: 'f-blinds-15', name: 'Blinds - 15 Lite', image: '/assets/glass/thumbnails/Blinds.webp' },
  { id: 'f-blinds-frlb-white', name: 'FRLB - White Blinds', image: '/assets/glass/thumbnails/Blinds.webp' },
  { id: 'f-blinds-frlb-tan', name: 'FRLB - Tan Blinds', image: '/assets/glass/thumbnails/Blinds.webp' },
  { id: 'f-blinds-frlb-espresso', name: 'FRLB - Espresso Blinds', image: '/assets/glass/thumbnails/Blinds.webp' },
  { id: 'f-blinds-frlb-gray', name: 'FRLB - Slate Gray Blinds', image: '/assets/glass/thumbnails/Blinds.webp' },
  { id: 'f-blinds-frlb-silver', name: 'FRLB - Silver Moon Blinds', image: '/assets/glass/thumbnails/Blinds.webp' },
  { id: 'f-blinds-frlb15-white', name: 'FRLB15 – Full 15 Lite Blinds (White)', image: '/assets/glass/thumbnails/Blinds.webp' },
  { id: 'f-ten-lite', name: 'Ten Lite', image: '/assets/glass/thumbnails/Clear-option.webp' },
  { id: 'f-clear-f10', name: 'F10 – Clear Full Lite - Standard', image: '/assets/glass/thumbnails/Clear-option.webp' },
  { id: 'f-clear-f10l', name: 'F10 – Clear Full Lite - Low-E', image: '/assets/glass/thumbnails/Clear-option.webp' },
  { id: 'f-clear-no-grids', name: 'Clear Glass with No Grids', image: '/assets/glass/thumbnails/Clear-option.webp' },
  { id: 'f-clear-grids', name: 'Clear Glass with Grids', image: '/assets/glass/thumbnails/CR14PL Craftsman Divided Lites.webp' },
  { id: 'f-clear-f15', name: 'Clear Glass with Grids - 15 Lite External', image: '/assets/glass/thumbnails/CR14PL Craftsman Divided Lites.webp' },
  { id: 'f-clear-f15int', name: 'Clear Glass with Grids - 15 Lite Internal Standard', image: '/assets/glass/thumbnails/CR14PL Craftsman Divided Lites.webp' },
  { id: 'f-clear-f15intl', name: 'Clear Glass with Grids - 15 Lite Internal Low-E', image: '/assets/glass/thumbnails/CR14PL Craftsman Divided Lites.webp' },
  { id: 'f-clear-fpraint', name: 'Clear Glass with Grids - Prairie Internal', image: '/assets/glass/thumbnails/CR14PL Craftsman Divided Lites.webp' },
  { id: 'f-clear-ften', name: 'Clear Glass with Grids - 10 Lite External', image: '/assets/glass/thumbnails/CR14PL Craftsman Divided Lites.webp' },
  { id: 'f-clear-nonstock', name: 'NONSTOCKCL – Non-Stock Clear Glass', image: '/assets/glass/thumbnails/Clear-option.webp' },
  { id: 'f-clic-nogrid', name: 'NOGRID – No Grids', image: '/assets/glass/thumbnails/Clear-option.webp' },
  { id: 'f-clic-ext-8l', name: 'External Grids - 8 Lite', image: '/assets/glass/thumbnails/EXTG.webp' },
  { id: 'f-clic-ext-10l', name: 'External Grids - 10 Lite', image: '/assets/glass/thumbnails/EXTG.webp' },
  { id: 'f-clic-ext-15l', name: 'External Grids - 15 Lite', image: '/assets/glass/thumbnails/EXTG.webp' },
  { id: 'f48-clear-f1248', name: 'Clear Glass - F1248 3/4 12 Lite Ext Grids', image: '/assets/glass/thumbnails/CR14PL Craftsman Divided Lites.webp' },
  { id: 'f48-clear-no-grids', name: 'Clear Glass', image: '/assets/glass/thumbnails/Clear-option.webp' },
  { id: 'f48-clear-grids', name: 'Clear Glass with Grids', image: '/assets/glass/thumbnails/CR14PL Craftsman Divided Lites.webp' },
  { id: 'f48-clear-f1248l', name: 'Clear Glass - F1248L 3/4 12 Lite Int Grids Low-E', image: '/assets/glass/thumbnails/CR14PL Craftsman Divided Lites.webp' },
  { id: 'f48-clear-f648l', name: 'Clear Glass - F648L 3/4 6 Lite Ext Grids Low-E', image: '/assets/glass/thumbnails/CR14PL Craftsman Divided Lites.webp' },
  { id: 'f48-clear-nonstock', name: 'NONSTOCKCL – Non-Stock', image: '/assets/glass/thumbnails/Clear-option.webp' },
  { id: 'f48-blinds-white', name: 'FRLB48 – 3/4 Lite Blinds - White Blinds', image: '/assets/glass/thumbnails/Blinds.webp' },
  { id: 'f48-clic-nogrid', name: 'NOGRID – No Grids', image: '/assets/glass/thumbnails/Clear-option.webp' },
  { id: 'f48-clic-ext-12l', name: 'External Grids - 12 Lite', image: '/assets/glass/thumbnails/EXTG.webp' },
  { id: 'frt-clear-f17rt', name: 'F17RT - 17 Lite Ext Grids Round Top', image: '/assets/glass/thumbnails/Clear-option.webp' },
  { id: 'hrt-clear-s11rt', name: 'S11RT - Half Round Top Clear Glass', image: '/assets/glass/thumbnails/Clear-option.webp' },
  { id: 'n-clear-ncl', name: 'NCL - Clear Glass Nine Panel', image: '/assets/glass/thumbnails/Clear-option.webp' },
  { id: 'qa-clear-qacl', name: 'QACL - Quarter Arch Clear Glass', image: '/assets/glass/thumbnails/Clear-option.webp' },
  { id: 'sat-clear-nonstock', name: 'NONSTOCKCL - Non-Stock Clear Glass', image: '/assets/glass/thumbnails/Clear-option.webp' },
  { id: 'so-clear-nonstock', name: 'NONSTOCKCL - Non-Stock Clear Glass', image: '/assets/glass/thumbnails/Clear-option.webp' },
  { id: 'so-clear-small-no-coating', name: 'Small Oval Clear - No Low-E', image: '/assets/glass/thumbnails/Clear-option.webp' },
  { id: 'so-clear-small-low-e', name: 'Small Oval Clear - Low-E', image: '/assets/glass/thumbnails/Clear-option.webp' },
  { id: 's-clear-s5', name: 'Clear Half Lite - S5 Standard', image: '/assets/glass/thumbnails/Clear-option.webp' },
  { id: 's-clear-no-grids', name: 'Clear Glass', image: '/assets/glass/thumbnails/Clear-option.webp' },
  { id: 's-clear-grids', name: 'Clear Glass with Grids', image: '/assets/glass/thumbnails/CR14PL Craftsman Divided Lites.webp' },
  { id: 's-clear-s5l', name: 'Clear Half Lite - S5L Low-E', image: '/assets/glass/thumbnails/Clear-option.webp' },
  { id: 's-clear-s9', name: 'Clear Grids and Vented - S9 Ext Grids', image: '/assets/glass/thumbnails/CR14PL Craftsman Divided Lites.webp' },
  { id: 's-clear-s9int', name: 'Clear Grids and Vented - S9INT Int Grids', image: '/assets/glass/thumbnails/CR14PL Craftsman Divided Lites.webp' },
  { id: 's-clear-s9intl', name: 'Clear Grids and Vented - S9INTL Int Grids Low-E', image: '/assets/glass/thumbnails/CR14PL Craftsman Divided Lites.webp' },
  { id: 's-clear-sv6', name: 'Clear Grids and Vented - SV6 Half Lite Vented', image: '/assets/glass/thumbnails/Clear-option.webp' },
  { id: 's-clear-nonstock', name: 'NONSTOCKCL - Non-Stock Clear Glass', image: '/assets/glass/thumbnails/Clear-option.webp' },
  { id: 's-blinds-srlb-white', name: 'SRLB - White Blinds', image: '/assets/glass/thumbnails/Blinds.webp' },
  { id: 's-blinds-srlb-tan', name: 'SRLB - Tan Blinds', image: '/assets/glass/thumbnails/Blinds.webp' },
  { id: 's-blinds-srlb-espresso', name: 'SRLB - Espresso Blinds', image: '/assets/glass/thumbnails/Blinds.webp' },
  { id: 's-blinds-srlb-gray', name: 'SRLB - Slate Gray Blinds', image: '/assets/glass/thumbnails/Blinds.webp' },
  { id: 's-blinds-srlb-silver', name: 'SRLB - Silver Moon Blinds', image: '/assets/glass/thumbnails/Blinds.webp' },
  { id: 's-blinds-srlb9-white', name: 'SRLB9 - White Blinds', image: '/assets/glass/thumbnails/Blinds.webp' },
  { id: 's-blinds-sfrlb-white', name: 'SFRLB - White Blinds', image: '/assets/glass/thumbnails/Blinds.webp' },
  { id: 's-blinds-sfrlb-tan', name: 'SFRLB - Tan Blinds', image: '/assets/glass/thumbnails/Blinds.webp' },
  { id: 's-blinds-sfrlb-espresso', name: 'SFRLB - Espresso Blinds', image: '/assets/glass/thumbnails/Blinds.webp' },
  { id: 's-blinds-sfrlb-gray', name: 'SFRLB - Slate Gray Blinds', image: '/assets/glass/thumbnails/Blinds.webp' },
  { id: 's-blinds-sfrlb-silver', name: 'SFRLB - Silver Moon Blinds', image: '/assets/glass/thumbnails/Blinds.webp' },
  { id: 's-blinds-sfrlb9-white', name: 'SFRLB9 - White Blinds', image: '/assets/glass/thumbnails/Blinds.webp' },
  { id: 's-clic-nogrid', name: 'NOGRID - No Grids', image: '/assets/glass/thumbnails/Clear-option.webp' },
  { id: 's-clic-ext-4l', name: 'EXTG - 4 Lite', image: '/assets/glass/thumbnails/EXTG.webp' },
  { id: 's-clic-ext-9l', name: 'EXTG - 9 Lite', image: '/assets/glass/thumbnails/EXTG.webp' },
  { id: 's836-blinds-h8rlb', name: 'H8RLB - Two 8x36 Blinds', image: '/assets/glass/thumbnails/Blinds.webp' },
  { id: 'sw-clear-swg', name: 'SWG - Half Round Glass With External Grids', image: '/assets/glass/thumbnails/CR14PL Craftsman Divided Lites.webp' },
  { id: 'sw-rain-nogrid', name: 'Rain - No Grid', image: '/assets/glass/thumbnails/Rain.webp' },
  { id: 'sw-rain-5l', name: 'Rain - 5L 5 Lite', image: '/assets/glass/thumbnails/Rain.webp' },
]

export const glassOptions: GlassOption[] = [
  ...glassThumbnailOptions.filter(
    ({ id }) => !['dorian', 'elegant', 'grace', 'heirlooms', 'majestic', 'monterey', 'nouveau', 'clic'].includes(id)
      && !id.startsWith('blinds')
      && id !== 'f-blinds-15'
      && !id.startsWith('low-e'),
  ),
  ...variantThumbnailOptions,
]
  .filter(({ id }) => !knownPrivacyGlassIds.has(id) || approvedPrivacyGlassIds.has(id))
  .filter(({ id }) => !knownDecorativeGlassIds.has(id) || approvedDecorativeGlassIds.has(id))
  .map(({ image, ...option }) => {
  const overlaysByDoorStyle: Record<string, string> = {}
  const cr14Overlay = cr14Overlays[option.id]
  const cr14plOverlay = cr14plOverlays[option.id]
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
  const frtOverlay = frtOverlays[option.id]
  const f764Overlay = f764Overlays[option.id]
  const hrtOverlay = hrtOverlays[option.id]
  const nOverlay = nOverlays[option.id]
  const satOverlay = satOverlays[option.id]
  const s2Overlay = s2Overlays[option.id]
  const s3Overlay = s3Overlays[option.id]
  const s4Overlay = s4Overlays[option.id]
  const soOverlay = soOverlays[option.id]
  const sOverlay = sOverlays[option.id]
  const fOverlay = fOverlays[option.id]
  const f48Overlay = f48Overlays[option.id]
  const f482Overlay = f482Overlays[option.id]
  const s836Overlay = s836Overlays[option.id]
  const swOverlay = swOverlays[option.id]

  if (cr14Overlay) {
    overlaysByDoorStyle.CR14 = glassOverlayAssetUrl('CR14', cr14Overlay)
  }

  if (cr14plOverlay) {
    overlaysByDoorStyle.CR14PL = glassOverlayAssetUrl('CR14PL', cr14plOverlay)
  }

  if (f848Overlay) {
    overlaysByDoorStyle.F848 = glassOverlayAssetUrl('F848', f848Overlay)
  }

  if (foOverlay) {
    overlaysByDoorStyle.FO = glassOverlayAssetUrl('FO', foOverlay)
  }

  if (qaOverlay) {
    overlaysByDoorStyle.QA = glassOverlayAssetUrl('QA', qaOverlay)
  }

  if (caOverlay) {
    overlaysByDoorStyle.CA = glassOverlayAssetUrl('CA', caOverlay)
  }

  if (threeLtOverlay) {
    overlaysByDoorStyle['3LT'] = glassOverlayAssetUrl('3LT', threeLtOverlay)
  }

  if (threeStepOverlay) {
    overlaysByDoorStyle['3STEP'] = glassOverlayAssetUrl('3STEP', threeStepOverlay)
  }

  if (fourLtOverlay) {
    overlaysByDoorStyle['4LT'] = glassOverlayAssetUrl('4LT', fourLtOverlay)
  }

  if (fiveLtOverlay) {
    overlaysByDoorStyle['5LT'] = glassOverlayAssetUrl('5LT', fiveLtOverlay)
  }

  if (f2Overlay) {
    overlaysByDoorStyle.F2 = glassOverlayAssetUrl('F2', f2Overlay)
  }

  if (f3Overlay) {
    overlaysByDoorStyle.F3 = glassOverlayAssetUrl('F3', f3Overlay)
  }

  if (f4Overlay) {
    overlaysByDoorStyle.F4 = glassOverlayAssetUrl('F4', f4Overlay)
  }

  if (frtOverlay) {
    overlaysByDoorStyle.FRT = glassOverlayAssetUrl('FRT', frtOverlay)
  }

  if (f764Overlay) {
    overlaysByDoorStyle.F764 = glassOverlayAssetUrl('F764', f764Overlay)
  }

  if (hrtOverlay) {
    overlaysByDoorStyle.HRT = glassOverlayAssetUrl('HRT', hrtOverlay)
  }

  if (nOverlay) {
    overlaysByDoorStyle.N = glassOverlayAssetUrl('N', nOverlay)
  }

  if (satOverlay) {
    overlaysByDoorStyle.SAT = glassOverlayAssetUrl('SAT', satOverlay)
  }

  if (s2Overlay) {
    overlaysByDoorStyle.S2 = glassOverlayAssetUrl('S2', s2Overlay)
  }

  if (s3Overlay) {
    overlaysByDoorStyle.S3 = glassOverlayAssetUrl('S3', s3Overlay)
  }

  if (s4Overlay) {
    overlaysByDoorStyle.S4 = glassOverlayAssetUrl('S4', s4Overlay)
  }

  if (soOverlay) {
    overlaysByDoorStyle.SO = glassOverlayAssetUrl('SO', soOverlay)
    overlaysByDoorStyle.SO2 = glassOverlayAssetUrl('SO', soOverlay)
  }

  if (sOverlay) {
    overlaysByDoorStyle.S = glassOverlayAssetUrl('S', sOverlay)
  }

  if (fOverlay) {
    overlaysByDoorStyle.F = glassOverlayAssetUrl('F', fOverlay)
  }

  if (f48Overlay) {
    overlaysByDoorStyle.F48 = glassOverlayAssetUrl('F48', f48Overlay)
  }

  if (f482Overlay) {
    overlaysByDoorStyle.F482 = glassOverlayAssetUrl('F482', f482Overlay)
  }

  if (s836Overlay) {
    overlaysByDoorStyle.S836 = glassOverlayAssetUrl('S836', s836Overlay)
  }

  if (swOverlay) {
    overlaysByDoorStyle.SW = glassOverlayAssetUrl('SW', swOverlay)
  }

  return {
    ...option,
    thumbnailPath: image,
    overlaysByDoorStyle,
  }
})
