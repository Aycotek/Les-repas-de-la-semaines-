// Références nutritionnelles - sources officielles ANSES / PNNS (voir SOURCES.md)
globalThis.REFERENCES = {
  // RNP / AS adulte par jour (ANSES, actualisation 2016-2021)
  rnp: {
    homme: { proteines_g_par_kg: 0.83, fibres_g: 30, calcium_mg: 950, fer_mg: 11, magnesium_mg: 420,
      potassium_mg: 3500, zinc_mg: 11.7, selenium_ug: 70, vitamineC_mg: 110, vitamineD_ug: 15,
      vitamineB9_ug: 330, vitamineB12_ug: 4, vitamineE_mg: 10, vitamineB1_mg: 1.2, vitamineB6_mg: 1.7 },
    femme: { proteines_g_par_kg: 0.83, fibres_g: 30, calcium_mg: 950, fer_mg: 16, magnesium_mg: 360,
      potassium_mg: 3500, zinc_mg: 9.3, selenium_ug: 70, vitamineC_mg: 110, vitamineD_ug: 15,
      vitamineB9_ug: 330, vitamineB12_ug: 4, vitamineE_mg: 9, vitamineB1_mg: 1.1, vitamineB6_mg: 1.6 }
  },
  poidsReference: { homme: 70, femme: 60 },
  limites: { sel_g: 5, ags_pct_energie: 12, sucres_libres_g: 50 },
  // Repères de consommation PNNS 2019 (confirmés PNNS 5, 2026-2030) - par personne
  reperes: {
    fruitsLegumes_par_jour: 5,          // portions, ex. 3 légumes + 2 fruits
    legumineuses_fois_par_semaine: 2,
    feculentComplet_par_jour: 1,
    poisson_fois_par_semaine: 2,        // dont 1 gras
    produitsLaitiers_par_jour: 2,
    fruitsACoque_g_par_jour: 30,
    viandeRouge_g_max_par_semaine: 500, // hors volaille
    charcuterie_g_max_par_semaine: 150
  },
  mois: ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"],
  saisons: { hiver: [12,1,2], printemps: [3,4,5], ete: [6,7,8], automne: [9,10,11] },
  // Fruits et légumes de saison en France métropolitaine (mangerbouger.fr, listes mensuelles)
  calendrier: {
    legumes: {
      1:["betterave","carotte","céleri","chou","chou de Bruxelles","chou-fleur","endive","épinard","fenouil","oignon","poireau","pomme de terre","potiron","topinambour"],
      2:["betterave","carotte","céleri","chou","chou de Bruxelles","chou-fleur","endive","épinard","fenouil","oignon","poireau","pomme de terre","potiron"],
      3:["artichaut","asperge","betterave","carotte","chou","chou-fleur","endive","épinard","fenouil","navet","oignon","poireau","pomme de terre","radis"],
      4:["artichaut","asperge","carotte","chou-fleur","épinard","fenouil","laitue","navet","petit pois","oignon nouveau","poireau","pomme de terre nouvelle","radis"],
      5:["artichaut","asperge","aubergine","carotte","courgette","épinard","fenouil","fève","laitue","navet","petit pois","oignon nouveau","pomme de terre nouvelle","radis","tomate"],
      6:["artichaut","aubergine","betterave","carotte","concombre","courgette","épinard","fenouil","fève","haricot vert","laitue","petit pois","poivron","pomme de terre nouvelle","radis","tomate"],
      7:["aubergine","betterave","carotte","concombre","courgette","fenouil","haricot vert","laitue","maïs","melon","poivron","pomme de terre","tomate"],
      8:["aubergine","betterave","carotte","concombre","courgette","fenouil","haricot vert","laitue","maïs","melon","poivron","pomme de terre","tomate"],
      9:["aubergine","betterave","carotte","céleri","chou","concombre","courgette","épinard","fenouil","haricot vert","maïs","poivron","pomme de terre","potiron","tomate"],
      10:["betterave","carotte","céleri","champignon","chou","chou-fleur","courge","épinard","fenouil","oignon","poireau","pomme de terre","potiron"],
      11:["betterave","carotte","céleri","champignon","chou","chou de Bruxelles","chou-fleur","courge","endive","épinard","fenouil","oignon","poireau","pomme de terre","potiron"],
      12:["betterave","carotte","céleri","chou","chou de Bruxelles","chou-fleur","endive","épinard","fenouil","oignon","poireau","pomme de terre","potiron","topinambour"]
    },
    fruits: {
      1:["citron","clémentine","kiwi","orange","poire","pomme"],2:["citron","clémentine","kiwi","orange","poire","pomme"],
      3:["citron","kiwi","orange","poire","pomme"],4:["fraise","pamplemousse","pomme","rhubarbe"],
      5:["cerise","fraise","pamplemousse","rhubarbe"],6:["abricot","cerise","fraise","framboise","melon","pêche","rhubarbe"],
      7:["abricot","brugnon","figue","framboise","melon","mûre","nectarine","pastèque","pêche","prune"],
      8:["abricot","brugnon","figue","framboise","melon","mûre","nectarine","pastèque","pêche","poire","prune"],
      9:["figue","mûre","poire","pomme","prune","raisin"],10:["châtaigne","coing","kiwi","poire","pomme","raisin"],
      11:["châtaigne","clémentine","coing","kiwi","poire","pomme"],12:["châtaigne","citron","clémentine","kiwi","orange","poire","pomme"]
    }
  }
};
