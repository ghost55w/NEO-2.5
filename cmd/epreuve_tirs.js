const { ovlcmd } = require('../lib/ovlcmd');
const axios = require('axios');
const joueurs = new Map();

const promptSystem = `
Tu es un assistant spécialisé dans l'analyse d'expressions textuelles décrivant un tir au football.
Ton rôle est d'extraire trois valeurs :
1. tir_type : description libre du type de tir (ex: tir direct, tir enroulé, tir piqué, tir croisé, trivela de l'extérieur du pied ou avec l'extérieur du pied)
2. tir_partie : partie du pied utilisée pour le tir parmi [intérieur du pied, extérieur du pied, cou de pied, pointe du pied, talon, tête]
3. tir_zone : zone de tir parmi [ras du sol gauche, ras du sol droite, ras du sol milieu, mi-hauteur gauche, mi-hauteur droite, lucarne gauche, lucarne droite, milieu]

Répond toujours au format JSON strict :
{
  "tir_type": "<valeur>",
  "tir_partie": "<valeur>",
  "tir_zone": "<valeur>"
}
Ne donne aucune explication supplémentaire.
`;

async function analyserTir(texte, repondre) {
  try {
    const fullText = `${promptSystem}\n"${texte}"`;
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: fullText }] }]
      },
      { headers: { 'Content-Type': 'application/json' } }
    );
    const data = response.data;
    if (data.candidates && data.candidates.length > 0) {
      const reponseTexte = data.candidates[0]?.content?.parts?.[0]?.text || "";
      const jsonMatch = reponseTexte.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    }
  } catch (err) {
    console.error("Erreur Gemini :", err);
  }
  return null;
}

// Fonction de validation locale
function validerTirTexte(texte) {
  texte = texte.toLowerCase();

  const tir_types = [
    "tir direct", "tir enroulé", "tir piqué", "tir croisé",
    "trivela", "extérieur du pied", "extérieur", "intérieur du pied"
  ];
  const tir_parties = [
    "intérieur du pied", "extérieur du pied", "cou de pied", "pointe du pied", "talon", "tête"
  ];
  const tir_zones = [
    "ras du sol gauche", "ras du sol droite", "ras du sol milieu",
    "mi-hauteur gauche", "mi-hauteur droite",
    "lucarne gauche", "lucarne droite", "milieu"
  ];

  const trouveType = tir_types.some(t => texte.includes(t));
  const trouvePartie = tir_parties.some(t => texte.includes(t));
  const trouveZone = tir_zones.some(t => texte.includes(t));

  return {
    trouveType,
    trouvePartie,
    trouveZone,
    valide: trouveType && trouvePartie && trouveZone
  };
}

ovlcmd({
  nom_cmd: 'exercice1',
  classe: 'BLUELOCK⚽',
  react: '⚽',
  desc: "Lance l'épreuve du loup"
}, async (ms_org, ovl, { repondre, auteur_Message }) => {
  try {
    await ovl.sendMessage(ms_org, {
      video: { url: 'https://files.catbox.moe/z64kuq.mp4' },
      gifPlayback: true,
      loop: true,
      caption: ''
    });

    const texteDebut = `*🔷ÉPREUVE DE TIRS⚽🥅*
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

                         ⚽BLUE🔷LOCK`;

    await ovl.sendMessage(ms_org, {
      image: { url: 'https://files.catbox.moe/09rll9.jpg' },
      caption: texteDebut
    });

    const rep = await ovl.recup_msg({ auteur: auteur_Message, ms_org, temps: 60000 });
    const response = rep?.message?.extendedTextMessage?.text || rep?.message?.conversation;
    if (!response) return repondre("⏳Pas de réponse, épreuve annulée.");
    if (response.toLowerCase() === "non") return repondre("❌ Lancement de l'exercice annulé...");

    if (response.toLowerCase() === "oui") {
      const id = auteur_Message;
      const timer = setTimeout(() => {
        if (joueurs.has(id)) {
          joueurs.get(id).en_cours = false;
          envoyerResultats(ms_org, ovl, joueurs.get(id));
        }
      }, 20 * 60 * 1000);

      joueurs.set(id, {
        id,
        tir_info: [],
        but: 0,
        tirs_total: 0,
        en_cours: true,
        timer,
        paused: false,
        remainingTime: 20 * 60 * 1000
      });

      await ovl.sendMessage(ms_org, {
        video: { url: "https://files.catbox.moe/zqm7et.mp4" },
        gifPlayback: true,
        loop: true,
        caption: `*⚽BLUE LOCK🔷:* Début de l'exercice ⌛ Durée : 20:00 mins`
      });
    }
  } catch (error) {
    repondre("❌ Une erreur est survenue.");
    console.error(error);
  }
});

ovlcmd({
  nom_cmd: 'epreuve du tir',
  isfunc: true
}, async (ms_org, ovl, { repondre, auteur_Message, texte }) => {
  if (!/blue\s*lock/i.test(texte)) return;
  const id = auteur_Message;
  const joueur = joueurs.get(id);
  if (!joueur || !joueur.en_cours) return;

  const validation = validerTirTexte(texte);
  if (!validation.valide) {
    clearTimeout(joueur.timer);
    joueur.en_cours = false;
    await ovl.sendMessage(ms_org, {
      video: { url: "https://files.catbox.moe/9k5b3v.mp4" },
      gifPlayback: true,
      loop: true,
      caption: "❌MISSED! : Tir incomplet — type, partie ou zone non reconnue."
    });
    return envoyerResultats(ms_org, ovl, joueur);
  }

  const analyse = await analyserTir(texte, repondre);
  if (!analyse || !analyse.tir_type || !analyse.tir_partie || !analyse.tir_zone) {
    clearTimeout(joueur.timer);
    joueur.en_cours = false;
    await ovl.sendMessage(ms_org, {
      video: { url: "https://files.catbox.moe/9k5b3v.mp4" },
      gifPlayback: true,
      loop: true,
      caption: "❌MISSED! : Tir non reconnu par le système."
    });
    return envoyerResultats(ms_org, ovl, joueur);
  }

  joueur.tirs_total++;
  const tir_courant = { tir_type: analyse.tir_type, tir_partie: analyse.tir_partie, tir_zone: analyse.tir_zone };
  const tir_repeté = joueur.tir_info.some(
    t => t.tir_type === tir_courant.tir_type &&
         t.tir_zone === tir_courant.tir_zone &&
         t.tir_partie === tir_courant.tir_partie
  );

  if (tir_repeté) {
    clearTimeout(joueur.timer);
    joueur.en_cours = false;
    await ovl.sendMessage(ms_org, {
      video: { url: "https://files.catbox.moe/9k5b3v.mp4" },
      gifPlayback: true,
      loop: true,
      caption: "❌MISSED! : Tir répété — le gardien l'arrête facilement."
    });
    return envoyerResultats(ms_org, ovl, joueur);
  }

  joueur.but++;
  joueur.tir_info.push(tir_courant);
  if (joueur.tir_info.length > 3) joueur.tir_info.shift();
  const restants = 18 - joueur.but;

  await ovl.sendMessage(ms_org, {
    video: { url: "https://files.catbox.moe/pad98d.mp4" },
    gifPlayback: true,
    loop: true,
    caption: `✅⚽GOAL : ${joueur.but} but${joueur.but > 1 ? 's' : ''} ⚽ marqué 🎯\n⚠️ \`Il vous reste ${restants} tirs\` ⌛`
  });

  if (joueur.but >= 18) {
    clearTimeout(joueur.timer);
    joueur.en_cours = false;
    return envoyerResultats(ms_org, ovl, joueur);
  }
});

async function envoyerResultats(ms_org, ovl, joueur) {
  const tag = `@${joueur.id.split('@')[0]}`;
  let rank = "❌";
  if (joueur.but >= 18) rank = "SS🥇";
  else if (joueur.but >= 12) rank = "S🥈";
  else if (joueur.but >= 6) rank = "A🥉";

  const result = `▔▔▔▔▔▔▔▔▔▔     ▔▔▔▔▔
                  *🔷BLUE LOCK⚽*
  ▔▔▔▔▔▔▔▔▔▔   ▔▔▔▔▔▔▔▔▔▔
    🔷RESULTATS DE L'ÉVALUATION📊

*🥅Exercice:* Épreuve de tirs
*👤Joueur:* ${tag}
*⚽Buts:* ${joueur.but}
*📊Rank:* ${rank}
`;

  await ovl.sendMessage(ms_org, {
    image: { url: "https://files.catbox.moe/1xnoc6.jpg" },
    caption: result,
    mentions: [joueur.id]
  });

  joueurs.delete(joueur.id);
}
