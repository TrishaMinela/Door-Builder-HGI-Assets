import type { GlassOption } from '../types'

const glassPreviewAssets: Record<string, string> = {
  "CR14BAY.png": "/assets/hgi-assets/Glass/CR14/CR14BAY.png",
  "CR14BLA.png": "/assets/hgi-assets/Glass/CR14/CR14BLA.png",
  "CR14CEL.png": "/assets/hgi-assets/Glass/CR14/CR14CEL.png",
  "CR14CHI.png": "/assets/hgi-assets/Glass/CR14/CR14CHI.png",
  "CR14COB.png": "/assets/hgi-assets/Glass/CR14/CR14COB.png",
  "CR14COU.png": "/assets/hgi-assets/Glass/CR14/CR14COU.png",
  "CR14CRO.png": "/assets/hgi-assets/Glass/CR14/CR14CRO.png",
  "CR14CUM.png": "/assets/hgi-assets/Glass/CR14/CR14CUM.png",
  "CR14DORNI.png": "/assets/hgi-assets/Glass/CR14/CR14DORNI.png",
  "CR14DORPA.png": "/assets/hgi-assets/Glass/CR14/CR14DORPA.png",
  "CR14DUT.png": "/assets/hgi-assets/Glass/CR14/CR14DUT.png",
  "CR14EDG.png": "/assets/hgi-assets/Glass/CR14/CR14EDG.png",
  "CR14LAU.png": "/assets/hgi-assets/Glass/CR14/CR14LAU.png",
  "CR14LEL.png": "/assets/hgi-assets/Glass/CR14/CR14LEL.png",
  "CR14LIN.png": "/assets/hgi-assets/Glass/CR14/CR14LIN.png",
  "CR14MAR.png": "/assets/hgi-assets/Glass/CR14/CR14MAR.png",
  "CR14MIC.png": "/assets/hgi-assets/Glass/CR14/CR14MIC.png",
  "CR14MIS.png": "/assets/hgi-assets/Glass/CR14/CR14MIS.png",
  "CR14MONNI.png": "/assets/hgi-assets/Glass/CR14/CR14MONNI.png",
  "CR14MONPA.png": "/assets/hgi-assets/Glass/CR14/CR14MONPA.png",
  "CR14OAK.png": "/assets/hgi-assets/Glass/CR14/CR14OAK.png",
  "CR14PAR.png": "/assets/hgi-assets/Glass/CR14/CR14PAR.png",
  "CR14PEM.png": "/assets/hgi-assets/Glass/CR14/CR14PEM.png",
  "CR14RAI.png": "/assets/hgi-assets/Glass/CR14/CR14RAI.png",
  "CR14RIV.png": "/assets/hgi-assets/Glass/CR14/CR14RIV.png",
  "CR14STR.png": "/assets/hgi-assets/Glass/CR14/CR14STR.png",
  "CR14TOP.png": "/assets/hgi-assets/Glass/CR14/CR14TOP.png",
  "CR14VAP.png": "/assets/hgi-assets/Glass/CR14/CR14VAP.png",
  "CR14VIL.png": "/assets/hgi-assets/Glass/CR14/CR14VIL.png",
  "CR14VIN.png": "/assets/hgi-assets/Glass/CR14/CR14VIN.png",
  "CR14WYN.png": "/assets/hgi-assets/Glass/CR14/CR14WYN.png",
  "F848BER.png": "/assets/hgi-assets/Glass/F848/F848BER.png",
  "F848BLA.png": "/assets/hgi-assets/Glass/F848/F848BLA.png",
  "F848CAD.png": "/assets/hgi-assets/Glass/F848/F848CAD.png",
  "F848CAL.png": "/assets/hgi-assets/Glass/F848/F848CAL.png",
  "F848CAR.png": "/assets/hgi-assets/Glass/F848/F848CAR.png",
  "F848CHI.png": "/assets/hgi-assets/Glass/F848/F848CHI.png",
  "F848COU.png": "/assets/hgi-assets/Glass/F848/F848COU.png",
  "F848CRO.png": "/assets/hgi-assets/Glass/F848/F848CRO.png",
  "F848CUM.png": "/assets/hgi-assets/Glass/F848/F848CUM.png",
  "F848DORNI.png": "/assets/hgi-assets/Glass/F848/F848DORNI.png",
  "F848DORPA.png": "/assets/hgi-assets/Glass/F848/F848DORPA.png",
  "F848ELEBW.png": "/assets/hgi-assets/Glass/F848/F848ELEBW.png",
  "F848ELENI.png": "/assets/hgi-assets/Glass/F848/F848ELENI.png",
  "F848ELEPA.png": "/assets/hgi-assets/Glass/F848/F848ELEPA.png",
  "F848EMP.png": "/assets/hgi-assets/Glass/F848/F848EMP.png",
  "F848F10.png": "/assets/hgi-assets/Glass/F848/F848F10.png",
  "F848GEN.png": "/assets/hgi-assets/Glass/F848/F848GEN.png",
  "F848GRAPA.png": "/assets/hgi-assets/Glass/F848/F848GRAPA.png",
  "F848HEIBB.png": "/assets/hgi-assets/Glass/F848/F848HEIBB.png",
  "F848HEINI.png": "/assets/hgi-assets/Glass/F848/F848HEINI.png",
  "F848HIG.png": "/assets/hgi-assets/Glass/F848/F848HIG.png",
  "F848JAC.png": "/assets/hgi-assets/Glass/F848/F848JAC.png",
  "F848LIN.png": "/assets/hgi-assets/Glass/F848/F848LIN.png",
  "F848MAJNI.png": "/assets/hgi-assets/Glass/F848/F848MAJNI.png",
  "F848MAR.png": "/assets/hgi-assets/Glass/F848/F848MAR.png",
  "F848MET.png": "/assets/hgi-assets/Glass/F848/F848MET.png",
  "F848MIC.png": "/assets/hgi-assets/Glass/F848/F848MIC.png",
  "F848MIS.png": "/assets/hgi-assets/Glass/F848/F848MIS.png",
  "F848MONPA.png": "/assets/hgi-assets/Glass/F848/F848MONPA.png",
  "F848NEO.png": "/assets/hgi-assets/Glass/F848/F848NEO.png",
  "F848NOUNI.png": "/assets/hgi-assets/Glass/F848/F848NOUNI.png",
  "F848NOUPA.png": "/assets/hgi-assets/Glass/F848/F848NOUPA.png",
  "F848OAK.png": "/assets/hgi-assets/Glass/F848/F848OAK.png",
  "F848PAR.png": "/assets/hgi-assets/Glass/F848/F848PAR.png",
  "F848PRE.png": "/assets/hgi-assets/Glass/F848/F848PRE.png",
  "F848RAI.png": "/assets/hgi-assets/Glass/F848/F848RAI.png",
  "F848TOP.png": "/assets/hgi-assets/Glass/F848/F848TOP.png",
  "F848VAP.png": "/assets/hgi-assets/Glass/F848/F848VAP.png",
  "F848VIL.png": "/assets/hgi-assets/Glass/F848/F848VIL.png",
  "F848WAT.png": "/assets/hgi-assets/Glass/F848/F848WAT.png",
  "FASH.png": "/assets/hgi-assets/Glass/F/DECO/FASH.png",
  "FBAY.png": "/assets/hgi-assets/Glass/F/DECO/FBAY.png",
  "F/FBAY.png": "/assets/hgi-assets/Glass/F/DECO/FBAY.png",
  "FBLA.png": "/assets/hgi-assets/Glass/F/DECO/FBLA.png",
  "F/FBLA.png": "/assets/hgi-assets/Glass/F/DECO/FBLA.png",
  "FBRI.png": "/assets/hgi-assets/Glass/F/DECO/FBRI.png",
  "F/FBRI.png": "/assets/hgi-assets/Glass/F/DECO/FBRI.png",
  "FCAD.png": "/assets/hgi-assets/Glass/F/DECO/FCAD.png",
  "F/FCAD.png": "/assets/hgi-assets/Glass/F/DECO/FCAD.png",
  "FCAL.png": "/assets/hgi-assets/Glass/F/DECO/FCAL.png",
  "F/FCAL.png": "/assets/hgi-assets/Glass/F/DECO/FCAL.png",
  "FCAR.png": "/assets/hgi-assets/Glass/F/DECO/FCAR.png",
  "F/FCAR.png": "/assets/hgi-assets/Glass/F/DECO/FCAR.png",
  "FCOB.png": "/assets/hgi-assets/Glass/F/DECO/FCOB.png",
  "F/FCOB.png": "/assets/hgi-assets/Glass/F/DECO/FCOB.png",
  "FCOU.png": "/assets/hgi-assets/Glass/F/DECO/FCOU.png",
  "F/FCOU.png": "/assets/hgi-assets/Glass/F/DECO/FCOU.png",
  "FCRO.png": "/assets/hgi-assets/Glass/F/DECO/FCRO.png",
  "F/FCRO.png": "/assets/hgi-assets/Glass/F/DECO/FCRO.png",
  "FCUM.png": "/assets/hgi-assets/Glass/F/DECO/FCUM.png",
  "F/FCUM.png": "/assets/hgi-assets/Glass/F/DECO/FCUM.png",
  "FDORNI.png": "/assets/hgi-assets/Glass/F/DECO/FDORNI.png",
  "F/FDORNI.png": "/assets/hgi-assets/Glass/F/DECO/FDORNI.png",
  "FDORPA.png": "/assets/hgi-assets/Glass/F/DECO/FDORPA.png",
  "F/FDORPA.png": "/assets/hgi-assets/Glass/F/DECO/FDORPA.png",
  "FDUT.png": "/assets/hgi-assets/Glass/F/DECO/FDUT.png",
  "F/FDUT.png": "/assets/hgi-assets/Glass/F/DECO/FDUT.png",
  "FEDG.png": "/assets/hgi-assets/Glass/F/DECO/FEDG.png",
  "F/FEDG.png": "/assets/hgi-assets/Glass/F/DECO/FEDG.png",
  "FELEBW.png": "/assets/hgi-assets/Glass/F/DECO/FELEBW.png",
  "FELEPA.png": "/assets/hgi-assets/Glass/F/DECO/FELEPA.png",
  "FELEPN.png": "/assets/hgi-assets/Glass/F/DECO/FELEPN.png",
  "FENT.png": "/assets/hgi-assets/Glass/F/DECO/FENT.png",
  "FF10.png": "/assets/hgi-assets/Glass/F/CLEAR STOCK/FF10.png",
  "FF10L.png": "/assets/hgi-assets/Glass/F/CLEAR STOCK/FF10L.png",
  "FF15WH.png": "/assets/hgi-assets/Glass/F/CLEAR STOCK/FF15WH.png",
  "FFPRAINT.png": "/assets/hgi-assets/Glass/F/CLEAR STOCK/FFPRAINT.png",
  "FFRLB15.png": "/assets/hgi-assets/Glass/F/DECO/FFRLB15.png",
  "FFTEN.png": "/assets/hgi-assets/Glass/F/CLEAR STOCK/FFTEN.png",
  "FGEN.png": "/assets/hgi-assets/Glass/F/DECO/FGEN.png",
  "FGRA.png": "/assets/hgi-assets/Glass/F/DECO/FGRA.png",
  "FHEIBB.png": "/assets/hgi-assets/Glass/F/DECO/FHEIBB.png",
  "FHEINI.png": "/assets/hgi-assets/Glass/F/DECO/FHEINI.png",
  "FHIG.png": "/assets/hgi-assets/Glass/F/DECO/FHIG.png",
  "FJAC.png": "/assets/hgi-assets/Glass/F/DECO/FJAC.png",
  "FJAM.png": "/assets/hgi-assets/Glass/F/DECO/FJAM.png",
  "FLAU.png": "/assets/hgi-assets/Glass/F/DECO/FLAU.png",
  "FLAZ.png": "/assets/hgi-assets/Glass/F/DECO/FLAZ.png",
  "FLEL.png": "/assets/hgi-assets/Glass/F/DECO/FLEL.png",
  "FLEX.png": "/assets/hgi-assets/Glass/F/DECO/FLEX.png",
  "FLIN.png": "/assets/hgi-assets/Glass/F/DECO/FLIN.png",
  "FLON.png": "/assets/hgi-assets/Glass/F/DECO/FLON.png",
  "FMAD.png": "/assets/hgi-assets/Glass/F/DECO/FMAD.png",
  "FMAJ.png": "/assets/hgi-assets/Glass/F/DECO/FMAJ.png",
  "FMAJNI.png": "/assets/hgi-assets/Glass/F/DECO/FMAJNI.png",
  "FMIC.png": "/assets/hgi-assets/Glass/F/DECO/FMIC.png",
  "FMOH.png": "/assets/hgi-assets/Glass/F/DECO/FMOH.png",
  "FMONPA.png": "/assets/hgi-assets/Glass/F/DECO/FMONPA.png",
  "FMONSN.png": "/assets/hgi-assets/Glass/F/DECO/FMONSN.png",
  "FNOUNI.png": "/assets/hgi-assets/Glass/F/DECO/FNOUNI.png",
  "FNOUPA.png": "/assets/hgi-assets/Glass/F/DECO/FNOUPA.png",
  "FOAK.png": "/assets/hgi-assets/Glass/F/DECO/FOAK.png",
  "FOCAD.png": "/assets/hgi-assets/Glass/FO/FOCAD.png",
  "FOFOCL.png": "/assets/hgi-assets/Glass/FO/FOFOCL.png",
  "FOGRANI.png": "/assets/hgi-assets/Glass/FO/FOGRANI.png",
  "FOGRAPA.png": "/assets/hgi-assets/Glass/FO/FOGRAPA.png",
  "FOHEIBB.png": "/assets/hgi-assets/Glass/FO/FOHEIBB.png",
  "FOHEINI.png": "/assets/hgi-assets/Glass/FO/FOHEINI.png",
  "FONOUNI.png": "/assets/hgi-assets/Glass/FO/FONOUNI.png",
  "FONOUPA.png": "/assets/hgi-assets/Glass/FO/FONOUPA.png",
  "FOVA.png": "/assets/hgi-assets/Glass/F/DECO/FOVA.png",
  "FPAR.png": "/assets/hgi-assets/Glass/F/DECO/FPAR.png",
  "FPEM.png": "/assets/hgi-assets/Glass/F/DECO/FPEM.png",
  "FPRE.png": "/assets/hgi-assets/Glass/F/DECO/FPRE.png",
  "FRAI.png": "/assets/hgi-assets/Glass/F/DECO/FRAI.png",
  "FREN.png": "/assets/hgi-assets/Glass/F/DECO/FREN.png",
  "FRIV.png": "/assets/hgi-assets/Glass/F/DECO/FRIV.png",
  "FRLBES.png": "/assets/hgi-assets/Glass/F/DECO/FRLBES.png",
  "FRLBGR.png": "/assets/hgi-assets/Glass/F/DECO/FRLBGR.png",
  "FRLBSA.png": "/assets/hgi-assets/Glass/F/DECO/FRLBSA.png",
  "FRLBSI.png": "/assets/hgi-assets/Glass/F/DECO/FRLBSI.png",
  "FRLBTA.png": "/assets/hgi-assets/Glass/F/DECO/FRLBTA.png",
  "FRLBWH.png": "/assets/hgi-assets/Glass/F/DECO/FRLBWH.png",
  "FSTE.png": "/assets/hgi-assets/Glass/F/DECO/FSTE.png",
  "FTOP.png": "/assets/hgi-assets/Glass/F/DECO/FTOP.png",
  "FVAP.png": "/assets/hgi-assets/Glass/F/DECO/FVAP.png",
  "FVIL.png": "/assets/hgi-assets/Glass/F/DECO/FVIL.png",
  "FWTS.png": "/assets/hgi-assets/Glass/F/DECO/FWTS.png",
  "QAGRANI.png": "/assets/hgi-assets/Glass/QA/QAGRANI.png",
  "QAGRAPA.png": "/assets/hgi-assets/Glass/QA/QAGRAPA.png",
  "QALON.png": "/assets/hgi-assets/Glass/QA/QALON.png",
  "QANOUNI.png": "/assets/hgi-assets/Glass/QA/QANOUNI.png",
  "QANOUPA.png": "/assets/hgi-assets/Glass/QA/QANOUPA.png",
  "QAPEM.png": "/assets/hgi-assets/Glass/QA/QAPEM.png",
  "QAQACL.png": "/assets/hgi-assets/Glass/QA/QAQACL.png",
  "QARIV.png": "/assets/hgi-assets/Glass/QA/QARIV.png",
  "QAVIN.png": "/assets/hgi-assets/Glass/QA/QAVIN.png",
  "QAWYN.png": "/assets/hgi-assets/Glass/QA/QAWYN.png",
  "S836BER.png": "/assets/hgi-assets/Glass/S836/S836BER.png",
  "S836BLA.png": "/assets/hgi-assets/Glass/S836/S836BLA.png",
  "S836CHI.png": "/assets/hgi-assets/Glass/S836/S836CHI.png",
  "S836COU.png": "/assets/hgi-assets/Glass/S836/S836COU.png",
  "S836CRO.png": "/assets/hgi-assets/Glass/S836/S836CRO.png",
  "S836CUM.png": "/assets/hgi-assets/Glass/S836/S836CUM.png",
  "S836DORNI.png": "/assets/hgi-assets/Glass/S836/S836DORNI.png",
  "S836DORPA.png": "/assets/hgi-assets/Glass/S836/S836DORPA.png",
  "S836ELEBW.png": "/assets/hgi-assets/Glass/S836/S836ELEBW.png",
  "S836ELEPA.png": "/assets/hgi-assets/Glass/S836/S836ELEPA.png",
  "S836ELEPN.png": "/assets/hgi-assets/Glass/S836/S836ELEPN.png",
  "S836EMP.png": "/assets/hgi-assets/Glass/S836/S836EMP.png",
  "S836F10.png": "/assets/hgi-assets/Glass/S836/S836F10.png",
  "S836GRA.png": "/assets/hgi-assets/Glass/S836/S836GRA.png",
  "S836H8RLB.png": "/assets/hgi-assets/Glass/S836/S836H8RLB.png",
  "S836HEIBB.png": "/assets/hgi-assets/Glass/S836/S836HEIBB.png",
  "S836HEINI.png": "/assets/hgi-assets/Glass/S836/S836HEINI.png",
  "S836LAS.png": "/assets/hgi-assets/Glass/S836/S836LAS.png",
  "S836LIN.png": "/assets/hgi-assets/Glass/S836/S836LIN.png",
  "S836MAJPA.png": "/assets/hgi-assets/Glass/S836/S836MAJPA.png",
  "S836MAR.png": "/assets/hgi-assets/Glass/S836/S836MAR.png",
  "S836MET.png": "/assets/hgi-assets/Glass/S836/S836MET.png",
  "S836MIC.png": "/assets/hgi-assets/Glass/S836/S836MIC.png",
  "S836MOH.png": "/assets/hgi-assets/Glass/S836/S836MOH.png",
  "S836NEO.png": "/assets/hgi-assets/Glass/S836/S836NEO.png",
  "S836NOUNI.png": "/assets/hgi-assets/Glass/S836/S836NOUNI.png",
  "S836NOUPA.png": "/assets/hgi-assets/Glass/S836/S836NOUPA.png",
  "S836PAR.png": "/assets/hgi-assets/Glass/S836/S836PAR.png",
  "S836PRE.png": "/assets/hgi-assets/Glass/S836/S836PRE.png",
  "S836RAI.png": "/assets/hgi-assets/Glass/S836/S836RAI.png",
  "S836REN.png": "/assets/hgi-assets/Glass/S836/S836REN.png",
  "S836TOP.png": "/assets/hgi-assets/Glass/S836/S836TOP.png",
  "S836VAP.png": "/assets/hgi-assets/Glass/S836/S836VAP.png",
  "S836VIL.png": "/assets/hgi-assets/Glass/S836/S836VIL.png",
  "S836WAT.png": "/assets/hgi-assets/Glass/S836/S836WAT.png",
  "SBER.png": "/assets/hgi-assets/Glass/S/DECO/SBER.png",
  "SBLA.png": "/assets/hgi-assets/Glass/S/DECO/SBLA.png",
  "SBRI.png": "/assets/hgi-assets/Glass/S/DECO/SBRI.png",
  "SCHI.png": "/assets/hgi-assets/Glass/S/DECO/SCHI.png",
  "SCOB.png": "/assets/hgi-assets/Glass/S/DECO/SCOB.png",
  "SCOU.png": "/assets/hgi-assets/Glass/S/DECO/SCOU.png",
  "SCRO.png": "/assets/hgi-assets/Glass/S/DECO/SCRO.png",
  "SCUM.png": "/assets/hgi-assets/Glass/S/DECO/SCUM.png",
  "SDORNI.png": "/assets/hgi-assets/Glass/S/DECO/SDORNI.png",
  "SDORPA.png": "/assets/hgi-assets/Glass/S/DECO/SDORPA.png",
  "SDUT.png": "/assets/hgi-assets/Glass/S/DECO/SDUT.png",
  "SEDG.png": "/assets/hgi-assets/Glass/S/DECO/SEDG.png",
  "SELEBW.png": "/assets/hgi-assets/Glass/S/DECO/SELEBW.png",
  "SELENI.png": "/assets/hgi-assets/Glass/S/DECO/SELENI.png",
  "SELEPA.png": "/assets/hgi-assets/Glass/S/DECO/SELEPA.png",
  "SEMP.png": "/assets/hgi-assets/Glass/S/DECO/SEMP.png",
  "SF10.png": "/assets/hgi-assets/Glass/S/DECO/SF10.png",
  "SF5.png": "/assets/hgi-assets/Glass/S/DECO/SF5.png",
  "SF5L.png": "/assets/hgi-assets/Glass/S/DECO/SF5L.png",
  "SGRA.png": "/assets/hgi-assets/Glass/S/DECO/SGRA.png",
  "SHEIBB.png": "/assets/hgi-assets/Glass/S/DECO/SHEIBB.png",
  "SHEINI.png": "/assets/hgi-assets/Glass/S/DECO/SHEINI.png",
  "SJAC.png": "/assets/hgi-assets/Glass/S/DECO/SJAC.png",
  "SJAM.png": "/assets/hgi-assets/Glass/S/DECO/SJAM.png",
  "SLAU.png": "/assets/hgi-assets/Glass/S/DECO/SLAU.png",
  "SLAZ.png": "/assets/hgi-assets/Glass/S/DECO/SLAZ.png",
  "SLEL.png": "/assets/hgi-assets/Glass/S/DECO/SLEL.png",
  "SLEX.png": "/assets/hgi-assets/Glass/S/DECO/SLEX.png",
  "SLIN.png": "/assets/hgi-assets/Glass/S/DECO/SLIN.png",
  "SLON.png": "/assets/hgi-assets/Glass/S/DECO/SLON.png",
  "SMAJ.png": "/assets/hgi-assets/Glass/S/DECO/SMAJ.png",
  "SMAR.png": "/assets/hgi-assets/Glass/S/DECO/SMAR.png",
  "SMET.png": "/assets/hgi-assets/Glass/S/DECO/SMET.png",
  "SMIC.png": "/assets/hgi-assets/Glass/S/DECO/SMIC.png",
  "SMOH.png": "/assets/hgi-assets/Glass/S/DECO/SMOH.png",
  "SMONNI.png": "/assets/hgi-assets/Glass/S/DECO/SMONNI.png",
  "SMONPA.png": "/assets/hgi-assets/Glass/S/DECO/SMONPA.png",
  "SNEO.png": "/assets/hgi-assets/Glass/S/DECO/SNEO.png",
  "SNOUNI.png": "/assets/hgi-assets/Glass/S/DECO/SNOUNI.png",
  "SNOUPA.png": "/assets/hgi-assets/Glass/S/DECO/SNOUPA.png",
  "SOAK.png": "/assets/hgi-assets/Glass/S/DECO/SOAK.png",
  "SOBRI.png": "/assets/hgi-assets/Glass/SO/SOBRI.png",
  "SOCAD.png": "/assets/hgi-assets/Glass/SO/SOCAD.png",
  "SOCAR.png": "/assets/hgi-assets/Glass/SO/SOCAR.png",
  "SOELENI.png": "/assets/hgi-assets/Glass/SO/SOELENI.png",
  "SOELEPA.png": "/assets/hgi-assets/Glass/SO/SOELEPA.png",
  "SOGRC.png": "/assets/hgi-assets/Glass/SO/SOGRC.png",
  "SOHEIBB.png": "/assets/hgi-assets/Glass/SO/SOHEIBB.png",
  "SOHEINI.png": "/assets/hgi-assets/Glass/SO/SOHEINI.png",
  "SOJAM.png": "/assets/hgi-assets/Glass/S/DECO/SOJAM.png",
  "S/SOJAM.png": "/assets/hgi-assets/Glass/S/DECO/SOJAM.png",
  "SO/SOJAM.png": "/assets/hgi-assets/Glass/SO/SOJAM.png",
  "SOLAU.png": "/assets/hgi-assets/Glass/S/DECO/SOLAU.png",
  "S/SOLAU.png": "/assets/hgi-assets/Glass/S/DECO/SOLAU.png",
  "SO/SOLAU.png": "/assets/hgi-assets/Glass/SO/SOLAU.png",
  "SONOUNI.png": "/assets/hgi-assets/Glass/SO/SONOUNI.png",
  "SONOUPA.png": "/assets/hgi-assets/Glass/SO/SONOUPA.png",
  "SOOVA.png": "/assets/hgi-assets/Glass/SO/SOOVA.png",
  "SORAI.png": "/assets/hgi-assets/Glass/SO/SORAI.png",
  "SOREN.png": "/assets/hgi-assets/Glass/SO/SOREN.png",
  "SPAR.png": "/assets/hgi-assets/Glass/S/DECO/SPAR.png",
  "SPEM.png": "/assets/hgi-assets/Glass/S/DECO/SPEM.png",
  "SPRE.png": "/assets/hgi-assets/Glass/S/DECO/SPRE.png",
  "SRAI.png": "/assets/hgi-assets/Glass/S/DECO/SRAI.png",
  "SREN.png": "/assets/hgi-assets/Glass/S/DECO/SREN.png",
  "SRIV.png": "/assets/hgi-assets/Glass/S/DECO/SRIV.png",
  "SRLBES.png": "/assets/hgi-assets/Glass/S/DECO/SRLBES.png",
  "SRLBGR.png": "/assets/hgi-assets/Glass/S/DECO/SRLBGR.png",
  "SRLBSA.png": "/assets/hgi-assets/Glass/S/DECO/SRLBSA.png",
  "SRLBSI.png": "/assets/hgi-assets/Glass/S/DECO/SRLBSI.png",
  "SRLBTA.png": "/assets/hgi-assets/Glass/S/DECO/SRLBTA.png",
  "SRLBWH.png": "/assets/hgi-assets/Glass/S/DECO/SRLBWH.png",
  "SS5L.png": "/assets/hgi-assets/Glass/S/DECO/SS5L.png",
  "SS9INT.png": "/assets/hgi-assets/Glass/S/DECO/SS9INT.png",
  "SS9INTL.png": "/assets/hgi-assets/Glass/S/DECO/SS9INTL.png",
  "SSRLB9.png": "/assets/hgi-assets/Glass/S/DECO/SSRLB9.png",
  "SSV9.png": "/assets/hgi-assets/Glass/S/DECO/SSV9.png",
  "STOP.png": "/assets/hgi-assets/Glass/S/DECO/STOP.png",
  "SVAP.png": "/assets/hgi-assets/Glass/S/DECO/SVAP.png",
  "SVIL.png": "/assets/hgi-assets/Glass/S/DECO/SVIL.png",
  "SAT/SATClear.png": "/assets/hgi-assets/Glass/SAT/SATClear.png",
  "SAT/SATClearLowE.png": "/assets/hgi-assets/Glass/SAT/SATClearLowE.png",
  "SAT/SATGraceNickel.png": "/assets/hgi-assets/Glass/SAT/SATGraceNickel.png",
  "SAT/SATGracePatina.png": "/assets/hgi-assets/Glass/SAT/SATGracePatina.png",
  "SAT/SATLaurel.png": "/assets/hgi-assets/Glass/SAT/SATLaurel.png",
  "SWGRAPA.png": "/assets/hgi-assets/Glass/SW/SWGRAPA.png",
  "SWGRC.png": "/assets/hgi-assets/Glass/SW/SWGRC.png",
  "SWGWH.png": "/assets/hgi-assets/Glass/SW/SWGWH.png",
  "SWHEIBB.png": "/assets/hgi-assets/Glass/SW/SWHEIBB.png",
  "SWHEINI.png": "/assets/hgi-assets/Glass/SW/SWHEINI.png",
  "SWMIC.png": "/assets/hgi-assets/Glass/SW/SWMIC.png",
  "SWNOUNI.png": "/assets/hgi-assets/Glass/SW/SWNOUNI.png",
  "SWNOUPA.png": "/assets/hgi-assets/Glass/SW/SWNOUPA.png",
  "SWREN.png": "/assets/hgi-assets/Glass/SW/SWREN.png",
  "SWTS.png": "/assets/hgi-assets/Glass/S/DECO/SWTS.png",
}

const glassOverlayAssetUrl = (folder: string, fileName: string) =>
  fileName.startsWith('/assets/hgi-assets/')
    ? fileName
    : glassPreviewAssets[`${folder}/${fileName}`] ?? glassPreviewAssets[fileName] ?? ''

const glassThumbnailOptions = [
  { id: 'ashbury', name: 'Ashbury', image: '/assets/glass/thumbnails/ASHBURY.jpg' },
  { id: 'bay-point', name: 'Bay Point', image: '/assets/glass/thumbnails/BAYPOINT.jpg' },
  { id: 'berkley', name: 'Berkley', image: '/assets/glass/thumbnails/BERKLEY.jpg' },
  { id: 'blanca', name: 'Blanca', image: '/assets/glass/thumbnails/BLANCA.jpg' },
  { id: 'blinds', name: 'Blinds', image: '/assets/glass/thumbnails/Blinds.png' },
  { id: 'briselle', name: 'Briselle', image: '/assets/glass/thumbnails/Decorative.png' },
  { id: 'bristol', name: 'Bristol', image: '/assets/glass/thumbnails/Bristol.png' },
  { id: 'cadence', name: 'Cadence', image: '/assets/glass/thumbnails/Cadence.png' },
  { id: 'calandra', name: 'Calandra', image: '/assets/glass/thumbnails/CALANDRA.jpg' },
  { id: 'carrollton', name: 'Carrollton', image: '/assets/glass/thumbnails/CARROLLTON.jpg' },
  { id: 'catalina', name: 'Catalina', image: '/assets/glass/thumbnails/CATALINA.jpg' },
  { id: 'chinchilla', name: 'Chinchilla', image: '/assets/glass/thumbnails/Chinchilla.png' },
  { id: 'clear', name: 'Clear Glass - Standard', image: '/assets/glass/thumbnails/Clear.png' },
  { id: 'clear-low-e', name: 'Clear Glass - Low-E', image: '/assets/glass/thumbnails/Clear.png' },
  { id: 'clic', name: 'CLIC', image: '/assets/glass/thumbnails/CLIC.png' },
  { id: 'cobblestone', name: 'Cobblestone', image: '/assets/glass/thumbnails/Cobblestone.png' },
  { id: 'courtyard', name: 'Courtyard', image: '/assets/glass/thumbnails/Courtyard.png' },
  { id: 'contg', name: 'CONTG', image: '/assets/glass/thumbnails/CONTG.png' },
  { id: 'crosswalk', name: 'Crosswalk', image: '/assets/glass/thumbnails/CROSSWALK.jpg' },
  { id: 'cubed', name: 'Cubed', image: '/assets/glass/thumbnails/Cubed.png' },
  { id: 'cumulus', name: 'Cumulus', image: '/assets/glass/thumbnails/Cumulus.png' },
  { id: 'cyndi', name: 'Cyndi', image: '/assets/glass/thumbnails/Decorative.png' },
  { id: 'decorative', name: 'Decorative', image: '/assets/glass/thumbnails/Decorative.png' },
  { id: 'dorian', name: 'Dorian', image: '/assets/glass/thumbnails/DORIAN.png' },
  { id: 'dutchcraft', name: 'Dutchcraft', image: '/assets/glass/thumbnails/Dutchcraft.png' },
  { id: 'edgewood', name: 'Edgewood', image: '/assets/glass/thumbnails/EDGEWOOD.jpg' },
  { id: 'elegant', name: 'Elegant', image: '/assets/glass/thumbnails/ELEGANT.jpg' },
  { id: 'empire', name: 'Empire', image: '/assets/glass/thumbnails/EMPIRE.jpg' },
  { id: 'entropy', name: 'Entropy', image: '/assets/glass/thumbnails/Entropy.png' },
  { id: 'extg', name: 'EXTG', image: '/assets/glass/thumbnails/EXTG.png' },
  { id: 'flatg', name: 'FLATG', image: '/assets/glass/thumbnails/FLATG.png' },
  { id: 'fragrance', name: 'Fragrance', image: '/assets/glass/thumbnails/Decorative.png' },
  { id: 'frosted', name: 'Frosted', image: '/assets/glass/thumbnails/Privacy.png' },
  { id: 'garrison', name: 'Garrison', image: '/assets/glass/thumbnails/Decorative.png' },
  { id: 'geneva', name: 'Geneva', image: '/assets/glass/thumbnails/GENEVA.jpg' },
  { id: 'grace', name: 'Grace', image: '/assets/glass/thumbnails/Grace.png' },
  { id: 'heirlooms', name: 'Heirlooms', image: '/assets/glass/thumbnails/Heirlooms.png' },
  { id: 'high-point', name: 'High Point', image: '/assets/glass/thumbnails/HIGH POINT.jpg' },
  { id: 'jacinto', name: 'Jacinto', image: '/assets/glass/thumbnails/JACINTO.jpg' },
  { id: 'jameston', name: 'Jameston', image: '/assets/glass/thumbnails/JAMESTON.jpg' },
  { id: 'laurel', name: 'Laurel', image: '/assets/glass/thumbnails/LAUREL.jpg' },
  { id: 'lazarus', name: 'Lazarus', image: '/assets/glass/thumbnails/Lazarus.png' },
  { id: 'leland', name: 'Leland', image: '/assets/glass/thumbnails/Leland.png' },
  { id: 'lexington', name: 'Lexington', image: '/assets/glass/thumbnails/Lexington.png' },
  { id: 'linen', name: 'Linen', image: '/assets/glass/thumbnails/Linen.png' },
  { id: 'london', name: 'London', image: '/assets/glass/thumbnails/LONDON.jpg' },
  { id: 'low-e', name: 'Low-E', image: '/assets/glass/thumbnails/LowE.png' },
  { id: 'low-e-plus', name: 'Low-E+', image: '/assets/glass/thumbnails/LowE+.png' },
  { id: 'low-e-366', name: 'Low-E 366', image: '/assets/glass/thumbnails/LowE366.png' },
  { id: 'majestic', name: 'Majestic', image: '/assets/glass/thumbnails/Majestic.png' },
  { id: 'margate', name: 'Margate', image: '/assets/glass/thumbnails/MARGATE.jpg' },
  { id: 'metro', name: 'Metro', image: '/assets/glass/thumbnails/METRO.jpg' },
  { id: 'micro-granite', name: 'Micro Granite', image: '/assets/glass/thumbnails/MicroGranite.png' },
  { id: 'mistify', name: 'Mistify', image: '/assets/glass/thumbnails/Mistify.png' },
  { id: 'mohave', name: 'Mohave', image: '/assets/glass/thumbnails/Mohave.png' },
  { id: 'monterey', name: 'Monterey', image: '/assets/glass/thumbnails/MONTEREY.jpg' },
  { id: 'neo', name: 'Neo', image: '/assets/glass/thumbnails/NEO.jpg' },
  { id: 'nouveau', name: 'Nouveau', image: '/assets/glass/thumbnails/Nouveau.png' },
  { id: 'oak-park', name: 'Oak Park', image: '/assets/glass/thumbnails/Oak Park.png' },
  { id: 'ocean-caming', name: 'Ocean Caming', image: '/assets/glass/thumbnails/Ocean Caming.png' },
  { id: 'ovation', name: 'Ovation', image: '/assets/glass/thumbnails/Ovation.png' },
  { id: 'paris', name: 'Paris', image: '/assets/glass/thumbnails/Paris-option-card.png' },
  { id: 'pembrook', name: 'Pembrook', image: '/assets/glass/thumbnails/PEMBROOK.jpg' },
  { id: 'prestige', name: 'Prestige', image: '/assets/glass/thumbnails/PRESTIGE.jpg' },
  { id: 'privacy', name: 'Privacy', image: '/assets/glass/thumbnails/Privacy.png' },
  { id: 'rain', name: 'Rain', image: '/assets/glass/thumbnails/Rain.png' },
  { id: 'renewed-impressions', name: 'Renewed Impressions', image: '/assets/glass/thumbnails/Renewed Impressions.png' },
  { id: 'retro', name: 'Retro', image: '/assets/glass/thumbnails/Retro.png' },
  { id: 'rill', name: 'Rill', image: '/assets/glass/thumbnails/Decorative.png' },
  { id: 'riverwood', name: 'Riverwood', image: '/assets/glass/thumbnails/RIVERWOOD.jpg' },
  { id: 'steamed', name: 'Steamed', image: '/assets/glass/thumbnails/STEAMED.jpg' },
  { id: 'sterling', name: 'Sterling', image: '/assets/glass/thumbnails/Sterling.png' },
  { id: 'topaz', name: 'Topaz', image: '/assets/glass/thumbnails/Topaz.png' },
  { id: 'vapor', name: 'Vapor', image: '/assets/glass/thumbnails/Vapor.png' },
  { id: 'vilano', name: 'Vilano', image: '/assets/glass/thumbnails/VILANO.jpg' },
  { id: 'vincraft', name: 'Vincraft', image: '/assets/glass/thumbnails/VINCRAFT.jpg' },
  { id: 'waterside', name: 'Waterside', image: '/assets/glass/thumbnails/WATERSIDE.jpg' },
  { id: 'wyngate', name: 'Wyngate', image: '/assets/glass/thumbnails/WYNGATE.jpg' },
]

const normalizeThumbnailName = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '')

export const glassSelectionThumbnail = (name: string) => {
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
  clear: 'CR14BLA.png',
  'cr14-divided-lites': '/assets/hgi-assets/Glass/CR14/CR14DL - CRAFTSMAN DIVIDED LITES.png',
  cobblestone: 'CR14COB.png',
  dutchcraft: 'CR14DUT.png',
  leland: 'CR14LEL.png',
  'oak-park': 'CR14OAK.png',
  paris: 'CR14PAR.png',
  rain: 'CR14RAI.png',
  topaz: 'CR14TOP.png',
}

const cr14plOverlays: Record<string, string> = {
  clear: '/assets/hgi-assets/Glass/CR14PL/Blanca.png',
  blanca: '/assets/hgi-assets/Glass/CR14PL/Blanca.png',
  'cr14-divided-lites': '/assets/hgi-assets/Glass/CR14PL/CR14DL - CRAFTSMAN DIVIDED LITES.png',
  baroque: '/assets/hgi-assets/Glass/CR14PL/Baroque.png',
  'bay-point': '/assets/hgi-assets/Glass/CR14PL/CR14PL - Baypoint.png',
  chinchilla: '/assets/hgi-assets/Glass/CR14PL/Chinchilla.png',
  courtyard: '/assets/hgi-assets/Glass/CR14PL/CR14PL - Courtyard.png',
  crosswalk: '/assets/hgi-assets/Glass/CR14PL/CR14PL - Crosswalk.png',
  'cr14pl-dorian': '/assets/hgi-assets/Glass/CR14PL/CR14PL - Dorian.png',
  edgewood: '/assets/hgi-assets/Glass/CR14PL/CR14PL - Edgewood.png',
  garrison: '/assets/hgi-assets/Glass/CR14PL/CR14PL - Garrison.png',
  laurel: '/assets/hgi-assets/Glass/CR14PL/CR14PL - Laurel.png',
  margate: '/assets/hgi-assets/Glass/CR14PL/CR14PL - Margate.png',
  mistify: '/assets/hgi-assets/Glass/CR14PL/CR14PL - Mistify.png',
  'cr14pl-monterey': '/assets/hgi-assets/Glass/CR14PL/CR14PL - Monterey.png',
  'oak-park': '/assets/hgi-assets/Glass/CR14PL/CR14PL - Oakpark.png',
  paris: '/assets/hgi-assets/Glass/CR14PL/CR14PL - Paris.png',
  pembrook: '/assets/hgi-assets/Glass/CR14PL/CR14PL - Pembrook.png',
  rill: '/assets/hgi-assets/Glass/CR14PL/CR14PL - Rill.png',
  riverwood: '/assets/hgi-assets/Glass/CR14PL/CR14PL - Riverwood.png',
  topaz: '/assets/hgi-assets/Glass/CR14PL/CR14PL - Topaz.png',
  vilano: '/assets/hgi-assets/Glass/CR14PL/CR14PL - Vilano.png',
  cumulus: '/assets/hgi-assets/Glass/CR14PL/Cumulus.png',
  'double-water': '/assets/hgi-assets/Glass/CR14PL/Double Water.png',
  'micro-granite': '/assets/hgi-assets/Glass/CR14PL/Microgranite.png',
  rain: '/assets/hgi-assets/Glass/CR14PL/Rain.png',
  streamed: '/assets/hgi-assets/Glass/CR14PL/Streamed.png',
  vapor: '/assets/hgi-assets/Glass/CR14PL/Vapor.png',
  vincraft: '/assets/hgi-assets/Glass/CR14PL/Vincraft.png',
  'wide-reed': '/assets/hgi-assets/Glass/CR14PL/Widereed.png',
  wyngate: '/assets/hgi-assets/Glass/CR14PL/Wyngate.png',
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
  'monterey-patina': 'F848MONPA.png',
  neo: 'F848NEO.png',
  'nouveau-nickel': 'F848NOUNI.png',
  'nouveau-patina': 'F848NOUPA.png',
  'oak-park': 'F848OAK.png',
  paris: 'F848PAR.png',
  prestige: 'F848PRE.png',
  streamed: '/assets/hgi-assets/Glass/CR14PL/Streamed.png',
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
  'qa-clear-qacl': 'QAQACL.png',
  'grace-nickel': 'QAGRANI.png',
  'grace-patina': 'QAGRAPA.png',
  'nouveau-nickel': 'QANOUNI.png',
  'nouveau-patina': 'QANOUPA.png',
  pembrook: 'QAPEM.png',
  riverwood: 'QARIV.png',
  vincraft: 'QAVIN.png',
}

const caOverlays: Record<string, string> = {
  'ca-grace-nickel': '/assets/hgi-assets/Glass/CA/CAGRANI.png',
  'ca-grace-patina': '/assets/hgi-assets/Glass/CA/CAGRAPA.png',
  'ca-heirloom-brass': '/assets/hgi-assets/Glass/CA/CAHEIRBRA.png',
  'ca-heirloom-nickel': '/assets/hgi-assets/Glass/CA/CAHEIRNI.png',
}

const threeLtOverlays: Record<string, string> = {
  chinchilla: '/assets/hgi-assets/Glass/RETRO/3LTCHI.png',
  clear: '/assets/hgi-assets/Glass/RETRO/3LTCLE.png',
  'clear-low-e': '/assets/hgi-assets/Glass/RETRO/3LTCLE.png',
  cubed: '/assets/hgi-assets/Glass/RETRO/3LTCUB.png',
  frosted: '/assets/hgi-assets/Glass/RETRO/3LTFRO.png',
  rain: '/assets/hgi-assets/Glass/RETRO/3LTRAI.png',
}

const threeStepOverlays: Record<string, string> = {
  chinchilla: '/assets/hgi-assets/Glass/RETRO/3STEPCHI.png',
  clear: '/assets/hgi-assets/Glass/RETRO/3STEPCLE.png',
  'clear-low-e': '/assets/hgi-assets/Glass/RETRO/3STEPCLE.png',
  cubed: '/assets/hgi-assets/Glass/RETRO/3STEPCUB.png',
  frosted: '/assets/hgi-assets/Glass/RETRO/3STEPFRO.png',
  rain: '/assets/hgi-assets/Glass/RETRO/3STEPRAI.png',
}

const fourLtOverlays: Record<string, string> = {
  chinchilla: '/assets/hgi-assets/Glass/RETRO/4LTCHI.png',
  clear: '/assets/hgi-assets/Glass/RETRO/4LTCLE.png',
  'clear-low-e': '/assets/hgi-assets/Glass/RETRO/4LTCLE.png',
  cubed: '/assets/hgi-assets/Glass/RETRO/4LTCUB.png',
  frosted: '/assets/hgi-assets/Glass/RETRO/4LTFRO.png',
  rain: '/assets/hgi-assets/Glass/RETRO/4LTRAI.png',
}

const fiveLtOverlays: Record<string, string> = {
  chinchilla: '/assets/hgi-assets/Glass/RETRO/5LTCHI.png',
  clear: '/assets/hgi-assets/Glass/RETRO/5LTCLE.png',
  'clear-low-e': '/assets/hgi-assets/Glass/RETRO/5LTCLE.png',
  cubed: '/assets/hgi-assets/Glass/RETRO/5LTCUB.png',
  frosted: '/assets/hgi-assets/Glass/RETRO/5LTFRO.png',
  rain: '/assets/hgi-assets/Glass/RETRO/5LTRAI.png',
}

const f2Overlays: Record<string, string> = {
  clear: '/assets/hgi-assets/Glass/F2/F2.png',
  frosted: '/assets/hgi-assets/Glass/F2/F2FRO.png',
}

const f3Overlays: Record<string, string> = {
  clear: '/assets/hgi-assets/Glass/F3/F3.png',
  frosted: '/assets/hgi-assets/Glass/F3/F3FRO.png',
}

const f4Overlays: Record<string, string> = {
  clear: '/assets/hgi-assets/Glass/F/CLEAR STOCK/FF10.png',
}

const frtOverlays: Record<string, string> = {
  'frt-clear-f17rt': '/assets/hgi-assets/Glass/FRT/FRT Glass.png',
}

const f764Overlays: Record<string, string> = {
  chinchilla: '/assets/hgi-assets/Glass/RETRO/F764CHI.png',
  clear: '/assets/hgi-assets/Glass/RETRO/F764CLE.png',
  'clear-low-e': '/assets/hgi-assets/Glass/RETRO/F764CLE.png',
  cubed: '/assets/hgi-assets/Glass/RETRO/F764CUB.png',
  frosted: '/assets/hgi-assets/Glass/RETRO/F764FRO.png',
  rain: '/assets/hgi-assets/Glass/RETRO/F764RAI.png',
}

const hrtOverlays: Record<string, string> = {
  'hrt-clear-s11rt': '/assets/hgi-assets/Glass/HRT/HRT.png',
  'nouveau-nickel': '/assets/hgi-assets/Glass/F/DECO/FNOUNI.png',
  'nouveau-patina': '/assets/hgi-assets/Glass/F/DECO/FNOUPA.png',
}

const nOverlays: Record<string, string> = {
  'n-clear-ncl': '/assets/hgi-assets/Glass/F/CLEAR STOCK/FF10.png',
  'heirlooms-brass': '/assets/hgi-assets/Glass/N/NHeirloomsBrass.png',
  'heirlooms-nickel': '/assets/hgi-assets/Glass/N/NHeirloomsNickel.png',
  'nouveau-nickel': '/assets/hgi-assets/Glass/N/NNouveaNickel.png',
  'nouveau-patina': '/assets/hgi-assets/Glass/N/NNouveaPatina.png',
  rain: '/assets/hgi-assets/Glass/F/DECO/FRAI.png',
  streamed: '/assets/hgi-assets/Glass/CR14PL/Streamed.png',
}

const satOverlays: Record<string, string> = {
  'sat-clear-nonstock': 'SATClear.png',
  'grace-nickel': 'SATGraceNickel.png',
  'grace-patina': 'SATGracePatina.png',
  laurel: 'SATLaurel.png',
  rain: '/assets/hgi-assets/Glass/F/DECO/FRAI.png',
}

const s2Overlays: Record<string, string> = {
  clear: '/assets/hgi-assets/Glass/F/CLEAR STOCK/FF10.png',
}

const s3Overlays: Record<string, string> = {
  clear: '/assets/hgi-assets/Glass/F/CLEAR STOCK/FF10.png',
}

const s4Overlays: Record<string, string> = {
  clear: '/assets/hgi-assets/Glass/F/CLEAR STOCK/FF10.png',
}

const soOverlays: Record<string, string> = {
  cadence: 'SOCAD.png',
  'so-clear-nonstock': '/assets/hgi-assets/Glass/FO/FOFOCL.png',
  'so-clear-small-no-coating': '/assets/hgi-assets/Glass/FO/FOFOCL.png',
  'so-clear-small-low-e': '/assets/hgi-assets/Glass/FO/FOFOCL.png',
  'elegant-nickel': 'SOELENI.png',
  'elegant-patina': 'SOELEPA.png',
  'grace-nickel': 'SOGRC.png',
  'heirlooms-brass': 'SOHEIBB.png',
  'heirlooms-nickel': 'SOHEINI.png',
  jameston: 'SOJAM.png',
  laurel: 'SOLAU.png',
  'nouveau-nickel': 'SONOUNI.png',
  'nouveau-patina': 'SONOUPA.png',
  rain: 'SORAI.png',
  'renewed-impressions': 'SOREN.png',
}

const sOverlays: Record<string, string> = {
  baroque: '/assets/hgi-assets/Glass/CR14PL/Baroque.png',
  berkley: 'SBER.png',
  blanca: 'SBLA.png',
  bristol: 'SBRI.png',
  chinchilla: 'SCHI.png',
  cobblestone: 'SCOB.png',
  courtyard: 'SCOU.png',
  crosswalk: 'SCRO.png',
  cumulus: 'SCUM.png',
  'double-water': '/assets/hgi-assets/Glass/CR14PL/Double Water.png',
  'dorian-nickel': 'SDORNI.png',
  'dorian-patina': 'SDORPA.png',
  dutchcraft: 'SDUT.png',
  edgewood: 'SEDG.png',
  'elegant-black-white': 'SELEBW.png',
  'elegant-nickel': 'SELENI.png',
  'elegant-patina': 'SELEPA.png',
  empire: 'SEMP.png',
  's-clear-no-grids': 'SF5.png',
  's-clear-grids': '/assets/hgi-assets/Glass/S/INTERNAL GRIDS/SINT9LWH.png',
  's-clear-s5': 'SF5.png',
  's-clear-s5l': 'SF5L.png',
  's-clear-s9': '/assets/hgi-assets/Glass/SDL/S9LXX.png',
  's-clear-s9int': 'SS9INT.png',
  's-clear-s9intl': 'SS9INTL.png',
  's-clear-sv6': 'SSV9.png',
  's-clear-nonstock': 'SF5.png',
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
  streamed: '/assets/hgi-assets/Glass/CR14PL/Streamed.png',
  's-blinds-srlb-white': 'SRLBWH.png',
  's-blinds-srlb-tan': 'SRLBTA.png',
  's-blinds-srlb-espresso': 'SRLBES.png',
  's-blinds-srlb-gray': 'SRLBGR.png',
  's-blinds-srlb-silver': 'SRLBSI.png',
  's-blinds-srlb9-white': 'SSRLB9.png',
  's-blinds-sfrlb-white': 'SRLBWH.png',
  's-blinds-sfrlb-tan': 'SRLBTA.png',
  's-blinds-sfrlb-espresso': 'SRLBES.png',
  's-blinds-sfrlb-gray': 'SRLBGR.png',
  's-blinds-sfrlb-silver': 'SRLBSI.png',
  's-blinds-sfrlb9-white': 'SSRLB9.png',
  's-clic-nogrid': 'SF5.png',
  's-clic-ext-4l': '/assets/hgi-assets/Glass/SDL/S4LXX.png',
  's-clic-ext-9l': '/assets/hgi-assets/Glass/SDL/S9LXX.png',
  topaz: 'STOP.png',
  vapor: 'SVAP.png',
  'wide-reed': '/assets/hgi-assets/Glass/CR14PL/Widereed.png',
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
  'f-clear-f10': 'FF10.png',
  'f-clear-f10l': 'FF10L.png',
  'f-clear-no-grids': 'FF10.png',
  'f-clear-grids': 'FF15WH.png',
  'f-clear-f15': 'FF15WH.png',
  'f-clear-f15int': '/assets/hgi-assets/Glass/F/INTERNAL GRIDS/FINT15LWH.png',
  'f-clear-f15intl': '/assets/hgi-assets/Glass/F/INTERNAL GRIDS/FINT15LWH.png',
  'f-clear-fpraint': 'FFPRAINT.png',
  'f-clear-ften': 'FFTEN.png',
  'f-clear-nonstock': 'FF10.png',
  'f-clic-nogrid': 'FF10.png',
  'f-clic-ext-8l': '/assets/hgi-assets/Glass/SDL/F8LXX.png',
  'f-clic-ext-10l': '/assets/hgi-assets/Glass/SDL/F10LXX.png',
  'f-clic-ext-15l': '/assets/hgi-assets/Glass/SDL/F15LXX.png',
  'f-f10l': 'FF10L.png',
  'f-f15wh': 'FF15WH.png',
  'f-prairie-internal': 'FFPRAINT.png',
  'f-blinds-15': 'FFRLB15.png',
  'f-blinds-frlb-white': 'FRLBWH.png',
  'f-blinds-frlb-tan': 'FRLBTA.png',
  'f-blinds-frlb-espresso': 'FRLBES.png',
  'f-blinds-frlb-gray': 'FRLBGR.png',
  'f-blinds-frlb-silver': 'FRLBSI.png',
  'f-blinds-frlb15-white': 'FFRLB15.png',
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
  'f48-clear-no-grids': '/assets/hgi-assets/Glass/F48/CLEAR STOCK/F48F10.png',
  'f48-clear-grids': '/assets/hgi-assets/Glass/F48/INTERNAL GRIDS/F48INT12LWH.png',
  'f48-clear-f1248': '/assets/hgi-assets/Glass/F48/CLEAR STOCK/F48F1248WH.png',
  'f48-clear-f1248l': '/assets/hgi-assets/Glass/F48/INTERNAL GRIDS/F48INT12LWH.png',
  'f48-clear-f648l': '/assets/hgi-assets/Glass/SDL/F648LXX.png',
  'f48-clear-nonstock': '/assets/hgi-assets/Glass/F48/CLEAR STOCK/F48F10.png',
  'f48-blinds-white': '/assets/hgi-assets/Glass/F48/DECO/F48FRLB48.png',
  'f48-clic-nogrid': '/assets/hgi-assets/Glass/F48/CLEAR STOCK/F48F10.png',
  'f48-clic-ext-12l': '/assets/hgi-assets/Glass/SDL/F4812LXX.png',
  ashbury: '/assets/hgi-assets/Glass/F482/F482Ashbury.png',
  baroque: '/assets/hgi-assets/Glass/CR14PL/Baroque.png',
  berkley: '/assets/hgi-assets/Glass/F482/F482Berkley.png',
  blanca: '/assets/hgi-assets/Glass/F48/DECO/F48BLA.png',
  briselle: '/assets/hgi-assets/Glass/F482/F482Briselle.png',
  cadence: '/assets/hgi-assets/Glass/F482/F482Cadence.png',
  calandra: '/assets/hgi-assets/Glass/F482/F482Calandra.png',
  chinchilla: '/assets/hgi-assets/Glass/F48/DECO/F48CHI.png',
  courtyard: '/assets/hgi-assets/Glass/F482/F482Courtyard.png',
  crosswalk: '/assets/hgi-assets/Glass/F482/F482Crosswalk.png',
  cumulus: '/assets/hgi-assets/Glass/F48/DECO/F48CUM.png',
  cyndi: '/assets/hgi-assets/Glass/F482/F482Cyndi.png',
  'dorian-nickel': '/assets/hgi-assets/Glass/F482/F482Dorian.png',
  'dorian-patina': '/assets/hgi-assets/Glass/F482/F482Dorian.png',
  edgewood: '/assets/hgi-assets/Glass/F482/F482Edgewood.png',
  'double-water': '/assets/hgi-assets/Glass/CR14PL/Double Water.png',
  'elegant-black-white': '/assets/hgi-assets/Glass/F482/F482Elegant.png',
  'elegant-nickel': '/assets/hgi-assets/Glass/F482/F482Elegant.png',
  'elegant-patina': '/assets/hgi-assets/Glass/F482/F482Elegant.png',
  empire: '/assets/hgi-assets/Glass/F482/F482Empire.png',
  fragrance: '/assets/hgi-assets/Glass/F482/F482Fragrance.png',
  garrison: '/assets/hgi-assets/Glass/F482/F482Garrison.png',
  'grace-nickel': '/assets/hgi-assets/Glass/F482/F482Grace.png',
  'grace-patina': '/assets/hgi-assets/Glass/F482/F482Grace.png',
  'heirlooms-brass': '/assets/hgi-assets/Glass/F482/F482Heirlooms.png',
  'heirlooms-nickel': '/assets/hgi-assets/Glass/F482/F482Heirlooms.png',
  'high-point': '/assets/hgi-assets/Glass/F482/F482Highpoint.png',
  jameston: '/assets/hgi-assets/Glass/F482/F482Jameston.png',
  'majestic-nickel': '/assets/hgi-assets/Glass/F482/F482Majestic.png',
  'majestic-patina': '/assets/hgi-assets/Glass/F482/F482Majestic.png',
  margate: '/assets/hgi-assets/Glass/F482/F482Margate.png',
  metro: '/assets/hgi-assets/Glass/F482/F482Metro.png',
  'micro-granite': '/assets/hgi-assets/Glass/F48/DECO/F48MIC.png',
  mistify: '/assets/hgi-assets/Glass/F482/F482Mistify.png',
  mohave: '/assets/hgi-assets/Glass/F482/F482Mohave.png',
  'monterey-nickel': '/assets/hgi-assets/Glass/F482/F482Monterey.png',
  'monterey-patina': '/assets/hgi-assets/Glass/F482/F482Monterey.png',
  neo: '/assets/hgi-assets/Glass/F482/F482Neo.png',
  'nouveau-nickel': '/assets/hgi-assets/Glass/F482/F482Nouvea.png',
  'nouveau-patina': '/assets/hgi-assets/Glass/F482/F482Nouvea.png',
  'oak-park': '/assets/hgi-assets/Glass/F482/F482Oakpark.png',
  paris: '/assets/hgi-assets/Glass/F482/F482Paris.png',
  pembrook: '/assets/hgi-assets/Glass/F482/F482Pembrook.png',
  prestige: '/assets/hgi-assets/Glass/F482/F482Prestige.png',
  rain: '/assets/hgi-assets/Glass/F48/DECO/F48RAI.png',
  rill: '/assets/hgi-assets/Glass/F482/F482Rill.png',
  riverwood: '/assets/hgi-assets/Glass/F482/F482Riverwood.png',
  sterling: '/assets/hgi-assets/Glass/F482/F482Sterling.png',
  streamed: '/assets/hgi-assets/Glass/CR14PL/Streamed.png',
  topaz: '/assets/hgi-assets/Glass/F482/F482Topaz.png',
  vilano: '/assets/hgi-assets/Glass/F482/F482Vilano.png',
  vincraft: '/assets/hgi-assets/Glass/F482/F482Vincraft.png',
  vapor: '/assets/hgi-assets/Glass/F48/DECO/F48VAP.png',
  waterside: '/assets/hgi-assets/Glass/F482/F482Waterside.png',
  'wide-reed': '/assets/hgi-assets/Glass/CR14PL/Widereed.png',
}

const f48Overlays: Record<string, string> = {
  clear: '/assets/hgi-assets/Glass/F48/CLEAR STOCK/F48F10.png',
  'f48-clear-no-grids': '/assets/hgi-assets/Glass/F48/CLEAR STOCK/F48F10.png',
  'clear-low-e': '/assets/hgi-assets/Glass/F48/CLEAR STOCK/F48F10.png',
  'f48-clear-grids': '/assets/hgi-assets/Glass/F48/INTERNAL GRIDS/F48INT12LWH.png',
  'f48-clear-f1248': '/assets/hgi-assets/Glass/F48/CLEAR STOCK/F48F1248WH.png',
  'f48-clear-f1248l': '/assets/hgi-assets/Glass/F48/INTERNAL GRIDS/F48INT12LWH.png',
  'f48-clear-f648l': '/assets/hgi-assets/Glass/SDL/F648LXX.png',
  'f48-clear-nonstock': '/assets/hgi-assets/Glass/F48/CLEAR STOCK/F48F10.png',
  'f48-blinds-white': '/assets/hgi-assets/Glass/F48/DECO/F48FRLB48.png',
  'f48-clic-nogrid': '/assets/hgi-assets/Glass/F48/CLEAR STOCK/F48F10.png',
  'f48-clic-ext-12l': '/assets/hgi-assets/Glass/SDL/F4812LXX.png',
  ashbury: '/assets/hgi-assets/Glass/F48/DECO/F48ASH.png',
  berkley: '/assets/hgi-assets/Glass/F48/DECO/F48BER.png',
  blanca: '/assets/hgi-assets/Glass/F48/DECO/F48BLA.png',
  briselle: '/assets/hgi-assets/Glass/F48/DECO/F48BRI.png',
  cadence: '/assets/hgi-assets/Glass/F48/DECO/F48CAD.png',
  calandra: '/assets/hgi-assets/Glass/F48/DECO/F48CAL.png',
  carrollton: '/assets/hgi-assets/Glass/F48/DECO/F48CAR.png',
  chinchilla: '/assets/hgi-assets/Glass/F48/DECO/F48CHI.png',
  courtyard: '/assets/hgi-assets/Glass/F48/DECO/F48COU.png',
  crosswalk: '/assets/hgi-assets/Glass/F48/DECO/F48CRO.png',
  cumulus: '/assets/hgi-assets/Glass/F48/DECO/F48CUM.png',
  cyndi: '/assets/hgi-assets/Glass/F482/F482Cyndi.png',
  'dorian-nickel': '/assets/hgi-assets/Glass/F48/DECO/F48DORNI.png',
  'dorian-patina': '/assets/hgi-assets/Glass/F48/DECO/F48DORPA.png',
  edgewood: '/assets/hgi-assets/Glass/F48/DECO/F48EDG.png',
  'elegant-black-white': '/assets/hgi-assets/Glass/F48/DECO/F48ELEBW.png',
  'elegant-nickel': '/assets/hgi-assets/Glass/F48/DECO/F48ELENI.png',
  'elegant-patina': '/assets/hgi-assets/Glass/F48/DECO/F48ELEPA.png',
  empire: '/assets/hgi-assets/Glass/F48/DECO/F48EMP.png',
  fragrance: '/assets/hgi-assets/Glass/F482/F482Fragrance.png',
  garrison: '/assets/hgi-assets/Glass/F482/F482Garrison.png',
  geneva: '/assets/hgi-assets/Glass/F48/DECO/F48GEN.png',
  'grace-nickel': '/assets/hgi-assets/Glass/F48/DECO/F48GRA.png',
  'grace-patina': '/assets/hgi-assets/Glass/F48/DECO/F48GRA.png',
  'heirlooms-brass': '/assets/hgi-assets/Glass/F48/DECO/F48HEIBB.png',
  'heirlooms-nickel': '/assets/hgi-assets/Glass/F48/DECO/F48HEINI.png',
  'high-point': '/assets/hgi-assets/Glass/F48/DECO/F48HIG.png',
  jacinto: '/assets/hgi-assets/Glass/F48/DECO/F48JAC.png',
  jameston: '/assets/hgi-assets/Glass/F48/DECO/F48JAM.png',
  linen: '/assets/hgi-assets/Glass/F48/DECO/F48LIN.png',
  london: '/assets/hgi-assets/Glass/F48/DECO/F48LON.png',
  'f-madison': '/assets/hgi-assets/Glass/F48/DECO/F48MAD.png',
  margate: '/assets/hgi-assets/Glass/F48/DECO/F48MAR.png',
  metro: '/assets/hgi-assets/Glass/F48/DECO/F48MET.png',
  mistify: '/assets/hgi-assets/Glass/F482/F482Mistify.png',
  'micro-granite': '/assets/hgi-assets/Glass/F48/DECO/F48MIC.png',
  mohave: '/assets/hgi-assets/Glass/F48/DECO/F48MOH.png',
  'monterey-nickel': '/assets/hgi-assets/Glass/F48/DECO/F48MONNI.png',
  'monterey-patina': '/assets/hgi-assets/Glass/F48/DECO/F48MONPA.png',
  neo: '/assets/hgi-assets/Glass/F48/DECO/F48NEO.png',
  'nouveau-nickel': '/assets/hgi-assets/Glass/F48/DECO/F48NOUNI.png',
  'nouveau-patina': '/assets/hgi-assets/Glass/F48/DECO/F48NOUPA.png',
  'oak-park': '/assets/hgi-assets/Glass/F48/DECO/F48OAK.png',
  paris: '/assets/hgi-assets/Glass/F48/DECO/F48PAR.png',
  pembrook: '/assets/hgi-assets/Glass/F48/DECO/F48PEM.png',
  prestige: '/assets/hgi-assets/Glass/F48/DECO/F48PRE.png',
  rain: '/assets/hgi-assets/Glass/F48/DECO/F48RAI.png',
  rill: '/assets/hgi-assets/Glass/F482/F482Rill.png',
  riverwood: '/assets/hgi-assets/Glass/F48/DECO/F48RIV.png',
  sterling: '/assets/hgi-assets/Glass/F482/F482Sterling.png',
  streamed: '/assets/hgi-assets/Glass/CR14PL/Streamed.png',
  topaz: '/assets/hgi-assets/Glass/F48/DECO/F48TOP.png',
  vapor: '/assets/hgi-assets/Glass/F48/DECO/F48VAP.png',
  vilano: '/assets/hgi-assets/Glass/F48/DECO/F48VIL.png',
  vincraft: '/assets/hgi-assets/Glass/F482/F482Vincraft.png',
  waterside: '/assets/hgi-assets/Glass/F48/DECO/F48WTS.png',
  baroque: '/assets/hgi-assets/Glass/CR14PL/Baroque.png',
  'double-water': '/assets/hgi-assets/Glass/CR14PL/Double Water.png',
  'wide-reed': '/assets/hgi-assets/Glass/CR14PL/Widereed.png',
}

const s836Overlays: Record<string, string> = {
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
  clear: 'S836F10.png',
  'grace-nickel': 'S836GRA.png',
  's836-blinds-h8rlb': 'S836H8RLB.png',
  'heirlooms-brass': 'S836HEIBB.png',
  'heirlooms-nickel': 'S836HEINI.png',
  'majestic-patina': 'S836MAJPA.png',
  margate: 'S836MAR.png',
  mistify: '/assets/hgi-assets/Glass/CR14PL/Mistify.png',
  'micro-granite': 'S836MIC.png',
  mohave: 'S836MOH.png',
  'nouveau-nickel': 'S836NOUNI.png',
  'nouveau-patina': 'S836NOUPA.png',
  'oak-park': '/assets/hgi-assets/Glass/F848/F848OAK.png',
  paris: 'S836PAR.png',
  rain: 'S836RAI.png',
  'renewed-impressions': 'S836REN.png',
  streamed: '/assets/hgi-assets/Glass/CR14PL/Streamed.png',
  topaz: 'S836TOP.png',
  vapor: 'S836VAP.png',
  vilano: 'S836VIL.png',
  waterside: 'S836WAT.png',
}

const swOverlays: Record<string, string> = {
  'sw-clear-swg': 'SWGWH.png',
  'grace-nickel': 'SWGRC.png',
  'grace-patina': 'SWGRAPA.png',
  'heirlooms-brass': 'SWHEIBB.png',
  'heirlooms-nickel': 'SWHEINI.png',
  laurel: '/assets/hgi-assets/Glass/S/DECO/SLAU.png',
  'micro-granite': 'SWMIC.png',
  'nouveau-nickel': 'SWNOUNI.png',
  'nouveau-patina': 'SWNOUPA.png',
  'renewed-impressions': 'SWREN.png',
  'sw-rain-nogrid': '/assets/hgi-assets/Glass/SW/SW - Rain.png',
  'sw-rain-5l': '/assets/hgi-assets/Glass/SW/SW - Rain 5LT.png',
}

const variantThumbnailOptions = [
  { id: 'baroque', name: 'Baroque', image: '/assets/glass/thumbnails/CR14PL Baroque.png' },
  { id: 'cr14pl-dorian', name: 'Dorian', image: '/assets/glass/thumbnails/DORIAN.png' },
  { id: 'cr14pl-monterey', name: 'Monterey', image: '/assets/glass/thumbnails/MONTEREY.jpg' },
  { id: 'double-water', name: 'Double Water', image: '/assets/glass/thumbnails/CR14PL Double Water.png' },
  { id: 'streamed', name: 'Streamed', image: '/assets/glass/thumbnails/CR14PL Streamed.png' },
  { id: 'wide-reed', name: 'Wide Reed', image: '/assets/glass/thumbnails/CR14PL Widereed.png' },
  { id: 'cr14-divided-lites', name: 'Craftsman Divided Lites', image: '/assets/glass/thumbnails/CR14PL Craftsman Divided Lites.png' },
  { id: 'ca-heirloom-brass', name: 'Heirloom - Brass', image: '/assets/glass/thumbnails/Heirlooms.png' },
  { id: 'ca-heirloom-nickel', name: 'Heirloom - Nickel', image: '/assets/glass/thumbnails/Heirlooms.png' },
  { id: 'ca-grace-nickel', name: 'Grace - Nickel', image: '/assets/glass/thumbnails/Grace.png' },
  { id: 'ca-grace-patina', name: 'Grace - Patina', image: '/assets/glass/thumbnails/Grace.png' },
  { id: 'dorian-nickel', name: 'Dorian - Nickel', image: '/assets/glass/thumbnails/DORIAN.png' },
  { id: 'dorian-patina', name: 'Dorian - Patina', image: '/assets/glass/thumbnails/DORIAN.png' },
  { id: 'elegant-black-white', name: 'Elegant - Black/White', image: '/assets/glass/thumbnails/ELEGANT.jpg' },
  { id: 'elegant-nickel', name: 'Elegant - Nickel', image: '/assets/glass/thumbnails/ELEGANT.jpg' },
  { id: 'elegant-patina', name: 'Elegant - Patina', image: '/assets/glass/thumbnails/ELEGANT.jpg' },
  { id: 'grace-nickel', name: 'Grace - Nickel', image: '/assets/glass/thumbnails/Grace.png' },
  { id: 'grace-patina', name: 'Grace - Patina', image: '/assets/glass/thumbnails/Grace.png' },
  { id: 'heirlooms-brass', name: 'Heirlooms - Brass', image: '/assets/glass/thumbnails/Heirlooms.png' },
  { id: 'heirlooms-nickel', name: 'Heirlooms - Nickel', image: '/assets/glass/thumbnails/Heirlooms.png' },
  { id: 'majestic-nickel', name: 'Majestic - Nickel', image: '/assets/glass/thumbnails/Majestic.png' },
  { id: 'majestic-patina', name: 'Majestic - Patina', image: '/assets/glass/thumbnails/Majestic.png' },
  { id: 'monterey-nickel', name: 'Monterey - Nickel', image: '/assets/glass/thumbnails/MONTEREY.jpg' },
  { id: 'monterey-patina', name: 'Monterey - Patina', image: '/assets/glass/thumbnails/MONTEREY.jpg' },
  { id: 'nouveau-nickel', name: 'Nouveau - Nickel', image: '/assets/glass/thumbnails/Nouveau.png' },
  { id: 'nouveau-patina', name: 'Nouveau - Patina', image: '/assets/glass/thumbnails/Nouveau.png' },
  { id: 'celestial', name: 'Celestial', image: '/assets/glass/thumbnails/Ocean Caming.png' },
  { id: 'courtyard', name: 'Courtyard', image: '/assets/glass/thumbnails/Courtyard.png' },
  { id: 'paris', name: 'Paris', image: '/assets/glass/thumbnails/Paris-option-card.png' },
  { id: 'blinds-espresso', name: 'Blinds - Espresso', image: '/assets/glass/thumbnails/Blinds.png' },
  { id: 'blinds-gray', name: 'Blinds - Gray', image: '/assets/glass/thumbnails/Blinds.png' },
  { id: 'blinds-sand', name: 'Blinds - Sand', image: '/assets/glass/thumbnails/Blinds.png' },
  { id: 'blinds-silver', name: 'Blinds - Silver', image: '/assets/glass/thumbnails/Blinds.png' },
  { id: 'blinds-tan', name: 'Blinds - Tan', image: '/assets/glass/thumbnails/Blinds.png' },
  { id: 'blinds-white', name: 'Blinds - White', image: '/assets/glass/thumbnails/Blinds.png' },
  { id: 'f-f10l', name: 'F10L', image: '/assets/glass/thumbnails/Clear.png' },
  { id: 'f-f15wh', name: 'F15 White Grid', image: '/assets/glass/thumbnails/Clear.png' },
  { id: 'f-prairie-internal', name: 'Prairie Internal', image: '/assets/glass/thumbnails/Clear.png' },
  { id: 'f-blinds-15', name: 'Blinds - 15 Lite', image: '/assets/glass/thumbnails/Blinds.png' },
  { id: 'f-blinds-frlb-white', name: 'FRLB - White Blinds', image: '/assets/glass/thumbnails/Blinds.png' },
  { id: 'f-blinds-frlb-tan', name: 'FRLB - Tan Blinds', image: '/assets/glass/thumbnails/Blinds.png' },
  { id: 'f-blinds-frlb-espresso', name: 'FRLB - Espresso Blinds', image: '/assets/glass/thumbnails/Blinds.png' },
  { id: 'f-blinds-frlb-gray', name: 'FRLB - Slate Gray Blinds', image: '/assets/glass/thumbnails/Blinds.png' },
  { id: 'f-blinds-frlb-silver', name: 'FRLB - Silver Moon Blinds', image: '/assets/glass/thumbnails/Blinds.png' },
  { id: 'f-blinds-frlb15-white', name: 'FRLB15 – Full 15 Lite Blinds (White)', image: '/assets/glass/thumbnails/Blinds.png' },
  { id: 'f-ten-lite', name: 'Ten Lite', image: '/assets/glass/thumbnails/Clear.png' },
  { id: 'f-madison', name: 'Madison', image: '/assets/glass/thumbnails/Decorative.png' },
  { id: 'f-clear-f10', name: 'F10 – Clear Full Lite - Standard', image: '/assets/glass/thumbnails/Clear.png' },
  { id: 'f-clear-f10l', name: 'F10 – Clear Full Lite - Low-E', image: '/assets/glass/thumbnails/Clear.png' },
  { id: 'f-clear-no-grids', name: 'Clear Glass with No Grids', image: '/assets/glass/thumbnails/Clear.png' },
  { id: 'f-clear-grids', name: 'Clear Glass with Grids', image: '/assets/glass/thumbnails/CR14PL Craftsman Divided Lites.png' },
  { id: 'f-clear-f15', name: 'Clear Glass with Grids - 15 Lite External', image: '/assets/glass/thumbnails/CR14PL Craftsman Divided Lites.png' },
  { id: 'f-clear-f15int', name: 'Clear Glass with Grids - 15 Lite Internal Standard', image: '/assets/glass/thumbnails/CR14PL Craftsman Divided Lites.png' },
  { id: 'f-clear-f15intl', name: 'Clear Glass with Grids - 15 Lite Internal Low-E', image: '/assets/glass/thumbnails/CR14PL Craftsman Divided Lites.png' },
  { id: 'f-clear-fpraint', name: 'Clear Glass with Grids - Prairie Internal', image: '/assets/glass/thumbnails/CR14PL Craftsman Divided Lites.png' },
  { id: 'f-clear-ften', name: 'Clear Glass with Grids - 10 Lite External', image: '/assets/glass/thumbnails/CR14PL Craftsman Divided Lites.png' },
  { id: 'f-clear-nonstock', name: 'NONSTOCKCL – Non-Stock Clear Glass', image: '/assets/glass/thumbnails/Clear.png' },
  { id: 'f-clic-nogrid', name: 'NOGRID – No Grids', image: '/assets/glass/thumbnails/Clear.png' },
  { id: 'f-clic-ext-8l', name: 'External Grids - 8 Lite', image: '/assets/glass/thumbnails/EXTG.png' },
  { id: 'f-clic-ext-10l', name: 'External Grids - 10 Lite', image: '/assets/glass/thumbnails/EXTG.png' },
  { id: 'f-clic-ext-15l', name: 'External Grids - 15 Lite', image: '/assets/glass/thumbnails/EXTG.png' },
  { id: 'f48-clear-f1248', name: 'Clear Glass - F1248 3/4 12 Lite Ext Grids', image: '/assets/glass/thumbnails/CR14PL Craftsman Divided Lites.png' },
  { id: 'f48-clear-no-grids', name: 'Clear Glass', image: '/assets/glass/thumbnails/Clear.png' },
  { id: 'f48-clear-grids', name: 'Clear Glass with Grids', image: '/assets/glass/thumbnails/CR14PL Craftsman Divided Lites.png' },
  { id: 'f48-clear-f1248l', name: 'Clear Glass - F1248L 3/4 12 Lite Int Grids Low-E', image: '/assets/glass/thumbnails/CR14PL Craftsman Divided Lites.png' },
  { id: 'f48-clear-f648l', name: 'Clear Glass - F648L 3/4 6 Lite Ext Grids Low-E', image: '/assets/glass/thumbnails/CR14PL Craftsman Divided Lites.png' },
  { id: 'f48-clear-nonstock', name: 'NONSTOCKCL – Non-Stock', image: '/assets/glass/thumbnails/Clear.png' },
  { id: 'f48-blinds-white', name: 'FRLB48 – 3/4 Lite Blinds - White Blinds', image: '/assets/glass/thumbnails/Blinds.png' },
  { id: 'f48-clic-nogrid', name: 'NOGRID – No Grids', image: '/assets/glass/thumbnails/Clear.png' },
  { id: 'f48-clic-ext-12l', name: 'External Grids - 12 Lite', image: '/assets/glass/thumbnails/EXTG.png' },
  { id: 'frt-clear-f17rt', name: 'F17RT - 17 Lite Ext Grids Round Top', image: '/assets/glass/thumbnails/Clear.png' },
  { id: 'hrt-clear-s11rt', name: 'S11RT - Half Round Top Clear Glass', image: '/assets/glass/thumbnails/Clear.png' },
  { id: 'n-clear-ncl', name: 'NCL - Clear Glass Nine Panel', image: '/assets/glass/thumbnails/Clear.png' },
  { id: 'qa-clear-qacl', name: 'QACL - Quarter Arch Clear Glass', image: '/assets/glass/thumbnails/Clear.png' },
  { id: 'sat-clear-nonstock', name: 'NONSTOCKCL - Non-Stock Clear Glass', image: '/assets/glass/thumbnails/Clear.png' },
  { id: 'so-clear-nonstock', name: 'NONSTOCKCL - Non-Stock Clear Glass', image: '/assets/glass/thumbnails/Clear.png' },
  { id: 'so-clear-small-no-coating', name: 'Small Oval Clear - No Low-E', image: '/assets/glass/thumbnails/Clear.png' },
  { id: 'so-clear-small-low-e', name: 'Small Oval Clear - Low-E', image: '/assets/glass/thumbnails/Clear.png' },
  { id: 's-clear-s5', name: 'Clear Half Lite - S5 Standard', image: '/assets/glass/thumbnails/Clear.png' },
  { id: 's-clear-no-grids', name: 'Clear Glass', image: '/assets/glass/thumbnails/Clear.png' },
  { id: 's-clear-grids', name: 'Clear Glass with Grids', image: '/assets/glass/thumbnails/CR14PL Craftsman Divided Lites.png' },
  { id: 's-clear-s5l', name: 'Clear Half Lite - S5L Low-E', image: '/assets/glass/thumbnails/Clear.png' },
  { id: 's-clear-s9', name: 'Clear Grids and Vented - S9 Ext Grids', image: '/assets/glass/thumbnails/CR14PL Craftsman Divided Lites.png' },
  { id: 's-clear-s9int', name: 'Clear Grids and Vented - S9INT Int Grids', image: '/assets/glass/thumbnails/CR14PL Craftsman Divided Lites.png' },
  { id: 's-clear-s9intl', name: 'Clear Grids and Vented - S9INTL Int Grids Low-E', image: '/assets/glass/thumbnails/CR14PL Craftsman Divided Lites.png' },
  { id: 's-clear-sv6', name: 'Clear Grids and Vented - SV6 Half Lite Vented', image: '/assets/glass/thumbnails/Clear.png' },
  { id: 's-clear-nonstock', name: 'NONSTOCKCL - Non-Stock Clear Glass', image: '/assets/glass/thumbnails/Clear.png' },
  { id: 's-blinds-srlb-white', name: 'SRLB - White Blinds', image: '/assets/glass/thumbnails/Blinds.png' },
  { id: 's-blinds-srlb-tan', name: 'SRLB - Tan Blinds', image: '/assets/glass/thumbnails/Blinds.png' },
  { id: 's-blinds-srlb-espresso', name: 'SRLB - Espresso Blinds', image: '/assets/glass/thumbnails/Blinds.png' },
  { id: 's-blinds-srlb-gray', name: 'SRLB - Slate Gray Blinds', image: '/assets/glass/thumbnails/Blinds.png' },
  { id: 's-blinds-srlb-silver', name: 'SRLB - Silver Moon Blinds', image: '/assets/glass/thumbnails/Blinds.png' },
  { id: 's-blinds-srlb9-white', name: 'SRLB9 - White Blinds', image: '/assets/glass/thumbnails/Blinds.png' },
  { id: 's-blinds-sfrlb-white', name: 'SFRLB - White Blinds', image: '/assets/glass/thumbnails/Blinds.png' },
  { id: 's-blinds-sfrlb-tan', name: 'SFRLB - Tan Blinds', image: '/assets/glass/thumbnails/Blinds.png' },
  { id: 's-blinds-sfrlb-espresso', name: 'SFRLB - Espresso Blinds', image: '/assets/glass/thumbnails/Blinds.png' },
  { id: 's-blinds-sfrlb-gray', name: 'SFRLB - Slate Gray Blinds', image: '/assets/glass/thumbnails/Blinds.png' },
  { id: 's-blinds-sfrlb-silver', name: 'SFRLB - Silver Moon Blinds', image: '/assets/glass/thumbnails/Blinds.png' },
  { id: 's-blinds-sfrlb9-white', name: 'SFRLB9 - White Blinds', image: '/assets/glass/thumbnails/Blinds.png' },
  { id: 's-clic-nogrid', name: 'NOGRID - No Grids', image: '/assets/glass/thumbnails/Clear.png' },
  { id: 's-clic-ext-4l', name: 'EXTG - 4 Lite', image: '/assets/glass/thumbnails/EXTG.png' },
  { id: 's-clic-ext-9l', name: 'EXTG - 9 Lite', image: '/assets/glass/thumbnails/EXTG.png' },
  { id: 's836-blinds-h8rlb', name: 'H8RLB - Two 8x36 Blinds', image: '/assets/glass/thumbnails/Blinds.png' },
  { id: 'sw-clear-swg', name: 'SWG - Half Round Glass With External Grids', image: '/assets/glass/thumbnails/CR14PL Craftsman Divided Lites.png' },
  { id: 'sw-rain-nogrid', name: 'Rain - No Grid', image: '/assets/glass/thumbnails/Rain.png' },
  { id: 'sw-rain-5l', name: 'Rain - 5L 5 Lite', image: '/assets/glass/thumbnails/Rain.png' },
]

export const glassOptions: GlassOption[] = [
  ...glassThumbnailOptions.filter(
    ({ id }) => !['dorian', 'elegant', 'grace', 'heirlooms', 'majestic', 'monterey', 'nouveau', 'clic'].includes(id)
      && !id.startsWith('blinds')
      && id !== 'f-blinds-15'
      && !id.startsWith('low-e'),
  ),
  ...variantThumbnailOptions,
].map(({ image, ...option }) => {
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
