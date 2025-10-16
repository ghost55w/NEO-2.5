const { ovlcmd } = require('../lib/ovlcmd');
const axios = require('axios');
const joueurs = new Map();
const cacheAnalyse = new Map();
const queue = [];
const MAX_CONCURRENCY = 10;
let activeTasks = 0;

// File d’attente pour analyser les tirs
async function enqueue(taskFn) {
  return new Promise(resolve => {
    queue.push({ taskFn, resolve });
    processQueue();
  });
}

async function processQueue() {
  if (activeTasks >= MAX_CONCURRENCY || queue.length === 0) return;
  const { taskFn, resolve } = queue.shift();
  activeTasks++;
  try {
    const result = await taskFn();
    resolve(result);
  } catch (e) {
    console.error('Erreur worker:', e);
    resolve(null);
  } finally {
    activeTasks--;
    processQueue();
  }
}

// Analyse du tir via Gemini avec cache
async function analyserTir(texte) {
  const key = texte.trim().toLowerCase();
  if (cacheAnalyse.has(key)) return cacheAnalyse.get(key);

  const prompt = `
Tu es un assistant d'analyse de tir au football.
Extrait:
- tir_type (tir direct, tir enroulé, tir piqué, tir croisé, trivela)
- tir_partie (intérieur du pied, extérieur du pied, cou de pied, pointe du pied, talon, tête)
- tir_zone (ras du sol gauche, ras du sol droite, ras du sol milieu, mi-hauteur gauche, mi-hauteur droite, lucarne gauche, lucarne droite, milieu)
Répond uniquement en JSON strict.
`;

  try {
    const { data } = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyCtDv8matHBhGOQF_bN4zPO-J9-60vnwFE',
      { contents: [{ parts: [{ text: `${prompt}\n"${texte}"` }] }] },
      { headers: { 'Content-Type': 'application/json' }, timeout: 2000 }
    );

    const txt = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const result = JSON.parse(txt.replace(/```json|```/g, '').trim());
    cacheAnalyse.set(key, result);
    return result;
  } catch (err) {
    console.error('Erreur Gemini:', err?.message || err);
    return null;
  }
}

// --- Commande d'exercice ---
ovlcmd({
  nom_cmd: 'exercice1⚽',
  classe: 'BLUELOCK⚽',
  react: '⚽',
  desc: "Lance l'épreuve de tirs"
}, async (ms_org, ovl, { repondre, auteur_Message }) => {
  try {
    await ovl.sendMessage(ms_org, { video: { url: 'https://files.catbox.moe/z64kuq.mp4' }, gifPlayback: true });

    const texteDebut = *🔷ÉPREUVE DE TIRS⚽🥅*
▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔░▒▒▒▒░░▒░

                   🔷⚽RÈGLES:
Dans cet exercice l'objectif est de marquer 18 buts en 18 tirs max dans le temps imparti ❗20 mins⌛ face à un gardien Robot qui  mémorise vos tirs pour bloquer le même tir de suite. ⚠Vous devez marquer au moins 6 buts sinon vous êtes éliminé ❌. 

⚠SI VOUS RATEZ UN TIR, FIN DE L'EXERCICE ❌.

▔▔▔▔▔▔▔ 🔷RANKING🏆 ▔▔▔▔▔▔▔  
                       
🥉Novice: 6 buts⚽ (25 pts) 
🥈Pro: 12 buts⚽ (50 pts) 
🥇Classe mondiale: 18 buts⚽🏆(100 pts) 

▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔░ ░                         

Souhaitez-vous lancer l'exercice ? :
✅ Oui
❌ Non

                         ⚽BLUE🔷LOCK;

    await ovl.sendMessage(ms_org, { image: { url: 'https://files.catbox.moe/09rll9.jpg' }, caption: texteDebut });

    const rep = await ovl.recup_msg({ auteur: auteur_Message, ms_org, temps: 60000 });
    const response = rep?.message?.extendedTextMessage?.text || rep?.message?.conversation;
    if (!response) return repondre("⏳Pas de réponse, épreuve annulée.");
    if (response.toLowerCase() === "non") return repondre("❌ Lancement de l'exercice annulé...");

    if (response.toLowerCase() === "oui") {
      const id = auteur_Message;
      const joueur = {
        id,
        tir_info: [],
        but: 0,
        tirs_total: 0,
        en_cours: true,
        paused: false,
        remainingTime: 20 * 60 * 1000,
        pauseTimestamp: null,
        timer: null
      };

      joueurs.set(id, joueur);
      startTimer(joueur, ms_org, ovl);

      await ovl.sendMessage(ms_org, {
        video: { url: "https://files.catbox.moe/zqm7et.mp4" },
        gifPlayback: true,
        caption: `*⚽BLUE LOCK🔷:* Début de l'exercice ⌛ Durée : 20:00 mins`
      });
    }
  } catch (err) {
    repondre("❌ Une erreur est survenue.");
    console.error(err);
  }
});

  // ⚽ emoji : analyse en cours
  await ovl.sendMessage(ms_org, { react: { text: '⚽' } });

// Validation du tir + conditions spéciales
function validerTirTexte(texte) {
  texte = texte.toLowerCase();
  const tir_types = ["tir direct", "tir enroulé", "tir piqué", "tir croisé", "trivela"];
  const tir_parties = ["intérieur du pied", "extérieur du pied", "cou de pied", "pointe du pied", "talon", "tête"];
  const tir_zones = ["ras du sol gauche", "ras du sol droite", "ras du sol milieu", "mi-hauteur gauche", "mi-hauteur droite", "lucarne gauche", "lucarne droite", "milieu"];

  const trouveType = tir_types.some(t => texte.includes(t));
  const trouvePartie = tir_parties.some(t => texte.includes(t));
  const trouveZone = tir_zones.some(t => texte.includes(t));

  let valide = trouveType && trouvePartie && trouveZone;
  let raisonRefus = "";

  if (texte.includes("tir") && (!trouveType || !trouvePartie || !trouveZone)) {
    return { valide: false, missed: true, raisonRefus: "❌ Missed Goal!" };
  }

  function courbeValide(txt) {
    const match = txt.match(/courb(e|ure)?.{0,10}?(\d+(\.\d+)?) ?(m|cm)/);
    if (!match) return false;
    let val = parseFloat(match[2]);
    if (match[5] === "cm") val /= 100;
    return val <= 2;
  }

  // Trivela
  if (texte.includes("trivela")) {
    if (texte.includes("pied droit")) {
      const corpsOk = texte.includes("60° à gauche") || texte.includes("60 degres à gauche");
      const courbeOk = courbeValide(texte);
      if (!corpsOk || !courbeOk) {
        valide = false;
        raisonRefus = "❌ Trivela pied droit invalide : corps 60° à gauche + courbe ≤ 2m.";
      }
    } else if (texte.includes("pied gauche")) {
      const corpsOk = texte.includes("60° à droite") || texte.includes("60 degres à droite");
      const courbeOk = courbeValide(texte);
      if (!corpsOk || !courbeOk) {
        valide = false;
        raisonRefus = "❌ Trivela pied gauche invalide : corps 60° à droite + courbe ≤ 2m.";
      }
    }
  }

  // Tir enroulé
  if (texte.includes("tir enroulé")) {
    if (texte.includes("pied droit")) {
      const corpsOk = texte.includes("60° à droite") || texte.includes("60 degres à droite");
      const courbeOk = courbeValide(texte);
      if (!corpsOk || !courbeOk) {
        valide = false;
        raisonRefus = "❌ Enroulé pied droit invalide : corps 60° à droite + courbe ≤ 2m.";
      }
    } else if (texte.includes("pied gauche")) {
      const corpsOk = texte.includes("60° à gauche") || texte.includes("60 degres à gauche");
      const courbeOk = courbeValide(texte);
      if (!corpsOk || !courbeOk) {
        valide = false;
        raisonRefus = "❌ Enroulé pied gauche invalide : corps 60° à gauche + courbe ≤ 2m.";
      }
    }
  }

  return { valide, raisonRefus, missed: false };
}

function validerTirTexte(texte, joueur) {
  texte = texte.toLowerCase();
  const tir_types = ["tir direct", "tir enroulé", "tir piqué", "tir croisé", "trivela"];
  const tir_parties = ["intérieur du pied", "extérieur du pied", "cou de pied", "pointe du pied", "talon", "tête"];
  const tir_zones = ["ras du sol gauche", "ras du sol droite", "ras du sol milieu", "mi-hauteur gauche", "mi-hauteur droite", "lucarne gauche", "lucarne droite", "milieu"];

  const trouveType = tir_types.find(t => texte.includes(t));
  const trouvePartie = tir_parties.find(t => texte.includes(t));
  const trouveZone = tir_zones.find(t => texte.includes(t));

  let valide = trouveType && trouveZone;
  let raisonRefus = "";

  if (texte.includes("tir") && (!trouveType || !trouveZone)) {
    return { valide: false, missed: true, raisonRefus: "❌ Missed Goal! Tir incomplet." };
  }

  function courbeValide(txt) {
    const match = txt.match(/courb(e|ure)?.{0,10}?(\d+(\.\d+)?) ?(m|cm)/);
    if (!match) return false;
    let val = parseFloat(match[2]);
    if (match[4] === "cm") val /= 100;
    return val <= 2;
  }

  // Cas spéciaux Trivela / Tir enroulé
  const checkSpecial = (typeTir, pied, corpsAttendu) => {
    const corpsOk = texte.includes(corpsAttendu);
    const courbeOk = courbeValide(texte);
    if (!corpsOk || !courbeOk) {
      valide = false;
      raisonRefus = `❌ ${typeTir} ${pied} invalide : corps ${corpsAttendu} + courbe ≤ 2m.`;
    }
  };

  if (texte.includes("trivela")) {
    if (texte.includes("pied droit")) checkSpecial("Trivela", "pied droit", "60° à gauche");
    else if (texte.includes("pied gauche")) checkSpecial("Trivela", "pied gauche", "60° à droite");
  }

  if (texte.includes("tir enroulé")) {
    if (texte.includes("pied droit")) checkSpecial("Enroulé", "pied droit", "60° à droite");
    else if (texte.includes("pied gauche")) checkSpecial("Enroulé", "pied gauche", "60° à gauche");
  }

  return { valide, raisonRefus, missed: false, tir_type: trouveType, tir_partie: trouvePartie, tir_zone: trouveZone };
}

// Fonction pour montrer l'analyse en cours
async function montrerAnalyseEnCours(ms_org, ovl) {
  // Envoie un emoji ⚽ pour indiquer que l'analyse du pavé est en cours
  await ovl.sendMessage(ms_org, { react: { text: '⚽' } });
}
                                                    
function validerTirTexte(texte, joueur) {
  texte = texte.toLowerCase();
  const tir_types = ["tir direct", "tir enroulé", "tir piqué", "tir croisé", "trivela"];
  const tir_zones = ["ras du sol gauche", "ras du sol droite", "ras du sol milieu", "mi-hauteur gauche", "mi-hauteur droite", "lucarne gauche", "lucarne droite", "milieu"];

  const trouveType = tir_types.find(t => texte.includes(t));
  const trouveZone = tir_zones.find(z => texte.includes(z));

  let valide = !!trouveType && !!trouveZone;
  let raisonRefus = "";

  if (!joueur.repeatHistory) {
    joueur.repeatHistory = { types: [], zones: [] };
  }

  function validerTirTexte(texte, joueur) {
  texte = texte.toLowerCase();
  const tir_types = ["tir direct", "tir enroulé", "tir piqué", "tir croisé", "trivela"];
  const tir_zones = ["ras du sol gauche", "ras du sol droite", "ras du sol milieu", "mi-hauteur gauche", "mi-hauteur droite", "lucarne gauche", "lucarne droite", "milieu"];

  const trouveType = tir_types.find(t => texte.includes(t));
  const trouveZone = tir_zones.find(z => texte.includes(z));

  let valide = !!trouveType && !!trouveZone;
  let raisonRefus = "";

  // Initialiser l'historique si absent
  if (!joueur.repeatHistory) {
    joueur.repeatHistory = { types: [], zones: [] };
  }

  // --- 🔁 Gestion des répétitions tir_type et tir_zone ---
  if (trouveType) {
    joueur.repeatHistory.types.push(trouveType);
    if (joueur.repeatHistory.types.length > 3) joueur.repeatHistory.types.shift();
  }

  if (trouveZone) {
    joueur.repeatHistory.zones.push(trouveZone);
    if (joueur.repeatHistory.zones.length > 3) joueur.repeatHistory.zones.shift();
  }

  // --- 🚫 Blocage si 3 tirs identiques consécutifs ---
  const typesDerniers = joueur.repeatHistory.types.slice(-3);
  if (typesDerniers.length === 3 && typesDerniers.every(t => t === typesDerniers[0])) {
    return { valide: false, missed: true, raisonRefus: "❌ Missed Goal! 3ᵉ tir_type identique consécutif." };
  }

  const zonesDerniers = joueur.repeatHistory.zones.slice(-3);
  if (zonesDerniers.length === 3 && zonesDerniers.every(z => z === zonesDerniers[0])) {
    return { valide: false, missed: true, raisonRefus: "❌ Missed Goal! 3ᵉ tir_zone identique consécutif." };
  }

  // --- ♻️ Réinitialisation logique : après 2 tirs différents ---
  const derniersTypes = joueur.repeatHistory.types.slice(-2);
  if (derniersTypes.length === 2 && derniersTypes[0] !== derniersTypes[1]) {
    // Deux tirs différents -> on autorise à nouveau les doubles répétitions
    joueur.repeatHistory.types = [derniersTypes[1]];
  }

  const derniersZones = joueur.repeatHistory.zones.slice(-2);
  if (derniersZones.length === 2 && derniersZones[0] !== derniersZones[1]) {
    joueur.repeatHistory.zones = [derniersZones[1]];
  }

  // --- ⚠️ Tir incomplet ---
  if (texte.includes("tir") && (!trouveType || !trouveZone)) {
    return { valide: false, missed: true, raisonRefus: "❌ Missed Goal! Tir incomplet." };
  }

  // --- ⚽ Cas spéciaux trivela / enroulé ---
  function courbeValide(txt) {
    const match = txt.match(/courb(e|ure)?.{0,10}?(\d+(\.\d+)?) ?(m|cm)/);
    if (!match) return false;
    let val = parseFloat(match[2]);
    if (match[4] === "cm") val /= 100;
    return val <= 2;
  }

  const checkSpecial = (typeTir, pied, corpsAttendu) => {
    const corpsOk = texte.includes(corpsAttendu);
    const courbeOk = courbeValide(texte);
    if (!corpsOk || !courbeOk) {
      valide = false;
      raisonRefus = `❌ ${typeTir} ${pied} invalide : corps ${corpsAttendu} + courbe ≤ 2m.`;
    }
  };

  if (texte.includes("trivela")) {
    if (texte.includes("pied droit")) checkSpecial("Trivela", "pied droit", "60° à gauche");
    else if (texte.includes("pied gauche")) checkSpecial("Trivela", "pied gauche", "60° à droite");
  }

  if (texte.includes("tir enroulé")) {
    if (texte.includes("pied droit")) checkSpecial("Enroulé", "pied droit", "60° à droite");
    else if (texte.includes("pied gauche")) checkSpecial("Enroulé", "pied gauche", "60° à gauche");
  }

  return { valide, raisonRefus, missed: false, tir_type: trouveType, tir_zone: trouveZone };
      } 

  // Cas spéciaux trivela / enroulé
  function courbeValide(txt) {
    const match = txt.match(/courb(e|ure)?.{0,10}?(\d+(\.\d+)?) ?(m|cm)/);
    if (!match) return false;
    let val = parseFloat(match[2]);
    if (match[4] === "cm") val /= 100;
    return val <= 2;
  }

  const checkSpecial = (typeTir, pied, corpsAttendu) => {
    const corpsOk = texte.includes(corpsAttendu);
    const courbeOk = courbeValide(texte);
    if (!corpsOk || !courbeOk) {
      valide = false;
      raisonRefus = `❌ ${typeTir} ${pied} invalide : corps ${corpsAttendu} + courbe ≤ 2m.`;
    }
  };

  if (texte.includes("trivela")) {
    if (texte.includes("pied droit")) checkSpecial("Trivela", "pied droit", "60° à gauche");
    else if (texte.includes("pied gauche")) checkSpecial("Trivela", "pied gauche", "60° à droite");
  }

  if (texte.includes("tir enroulé")) {
    if (texte.includes("pied droit")) checkSpecial("Enroulé", "pied droit", "60° à droite");
    else if (texte.includes("pied gauche")) checkSpecial("Enroulé", "pied gauche", "60° à gauche");
  }

  return { valide, raisonRefus, missed: false, tir_type: trouveType, tir_zone: trouveZone };
}

ovlcmd({ nom: "tir", categorie: "football" }, async (ctx) => {
  const { ms_org, text, sender } = ctx;
  const joueur = joueurs.get(sender) || { id: sender };

// Calcul classement
function calculerClassement() {
  return Array.from(joueurs.values())
    .sort((a, b) => b.score - a.score)
    .map((j, i) => `${i + 1}. @${j.id.split('@')[0]} - ${j.score} pts`)
    .join('\n') || "Aucun joueur pour le moment.";
}

// Commande principale
ovlcmd({ nom: "tir", categorie: "football" }, async (ctx) => {
  const { ms_org, text, sender } = ctx;
  if (!joueurs.has(sender)) joueurs.set(sender, { id: sender, score: 0, essais: 0, historique: [] });
  const joueur = joueurs.get(sender);

  // Réponse immédiate
  await ovl.sendMessage(ms_org, { react: { text: '⚡' } });

  // Analyse et validation dans la queue
  const { analyse, validation } = await enqueue(async () => ({
    analyse: await analyserTir(text),
    validation: validerTirTexte(text)
  }));

  // Enregistrer dans l’historique
  joueur.historique.push({ texte, valid: validation.valide, raison: validation.raisonRefus || "Goal +1" });

  if (!validation.valide) {
    // Tir raté
    const gifMissed = "https://files.catbox.moe/x5skj8.mp4" ;
    await ovl.sendMessage(ms_org, {
      text: validation.raisonRefus || "❌ Missed Goal!",
      gif: { url: gifMissed, loop: true }
    });
    return;
  }

  // Tir réussi
  joueur.score++;
  joueur.essais++;
  const gifGoal = "https://files.catbox.moe/pad98d.mp4" ;
  await ovl.sendMessage(ms_org, {
    text: `✅ Goal! Score: ${joueur.score} pts`,
    gif: { url: gifGoal, loop: true }
  });

  // Classement live
  const classement = calculerClassement();
  await ovl.sendMessage(ms_org, { text: `🏆 Classement actuel:\n${classement}` });

  // Historique complet interactif
  const historiqueTexte = joueur.historique.map((t, i) => `${i + 1}. ${t.valid ? "✅" : "❌"} ${t.texte} ${t.valid ? "" : `(${t.raison})`}`).join('\n');
  await ovl.sendMessage(ms_org, { text: `📋 Historique de tes tirs:\n${historiqueTexte}` });
});
