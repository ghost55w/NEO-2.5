const { ovlcmd } = require('../lib/ovlcmd');

const joueurs = new Map();

ovlcmd({
  nom_cmd: 'exercice2',
  classe: 'BLUELOCK⚽',
  react: '⚽',
  desc: "Lance l'épreuve de passes"
}, async (ms_org, ovl, { repondre, auteur_Message }) => {
  try {
    const gif_debut = 'https://files.catbox.moe/z64kuq.mp4';
    await ovl.sendMessage(ms_org, {
      video: { url: gif_debut },
      gifPlayback: true,
      caption: ''
    });

    const image_debut = 'https://files.catbox.moe/hdqyy8.jpg';
    const texteDebut = `*🔷ÉPREUVE DE PASSES⚽🎯*
▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔░▒▒▒▒░░▒░
🔷⚽RÈGLES:
⚠Dans cet entraînement, l'objectif est de réussir un contrôle de balle puis réaliser la bonne passe avant la fin du temps imparti⌛ 30 mins❗sinon vous échouez à l'épreuve❌, Si vous faites un mauvais pavé(mauvais contrôle/mauvaise passe) fin de l'épreuve pour vous❌.
🥅Les ballons ⚽ sont projetés à grande vitesse sur vous en sortant des murs de l'air d'entraînement. un exercice réussi rapporte 50 pts et vous aurez besoin de minimum 150 pts pour passer l'épreuve.

▔▔▔▔▔▔▔ 🔷RANKING🏆 ▔▔▔▔▔▔▔  
🥉Novice: 150 pts 
🥈Pro: 300 pts
🥇Classe mondiale: 450 pts🏆

▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔░ ░                         

⚠🎙SOUHAITEZ VOUS COMMENCER L'ENTRAÎNEMENT ? :
✅Oui 
❌Non

⚽BLUE🔷LOCK`;

    await ovl.sendMessage(ms_org, {
      image: { url: image_debut },
      caption: texteDebut
    });

    const rep = await ovl.recup_msg({ auteur: auteur_Message, ms_org, temps: 60000 });
    const response = rep?.message?.extendedTextMessage?.text || rep?.message?.conversation;

    if (!response) return repondre("⏳Pas de réponse, épreuve annulée.");

    if (response.toLowerCase() === "non") {
      return repondre("❌ Lancement de l'exercice annulé...");
    }

    if (response.toLowerCase() === "oui") {
      await ovl.sendMessage(ms_org, {
        video: { url: "https://files.catbox.moe/zqm7et.mp4" },
        gifPlayback: true,
        caption: `*⚽BLUE LOCK🔷:* Début de l'exercice ⌛ Durée : 20:00 mins`
      });

      const id = auteur_Message;
      if (!joueurs.has(id)) {
        joueurs.set(id, {
          id,
          tir_type: null,
          tir_zone: null,
          tir_info: [],
          but: 0
        });
      }
    }

  } catch (error) {
    if (error.message === 'Timeout') {
      repondre("⏳ Temps écoulé, épreuve annulée.");
    } else {
      repondre("❌ Une erreur est survenue.");
      console.error(error);
    }
  }
});

ovlcmd({
  nom_cmd: 'arrete_epreuve',
  alias: ['arret_epreuve', 'stop_epreuve'],
  react: '🛑',
  desc: "Arrête l'épreuve du loup"
}, async (ms_org, ovl, { repondre }) => {
  if (!epreuveActive) return repondre("⛔ Aucune épreuve en cours.");

  if (timerId) clearTimeout(timerId);
  if (rappelInterval) clearInterval(rappelInterval);

  epreuveActive = false;
  timerId = null;
  rappelInterval = null;
  loupJid = null;
  historiqueLoups = [];

  await ovl.sendMessage(ms_org, {
    text: `🔷⚽ÉPREUVE DU LOUP🥅
▔▔▔▔▔▔▔▔▔▔▔▔▔░▒▒▒▒░░▒░

❌Épreuve arrêtée manuellement.
       
▔▔▔▔▔▔▔▔▔▔▔▔▔▔▱▱▱▔▔
     ⚽BLUE🔷LOCK`
  });
});

async function detecterPave(texte) {
  // Sfunction detecterPave(texte) {
  // Liste des mots-clés à reconnaître dans le texte
  const motsCles = [
    "contrôle de l'extérieur du pieds gauche",
    "contrôle de l'intérieur du pieds droit",
    "10cm",
    "passe directe",
    "ras du sol",
    "de l'intérieur du pieds gauche",
    "avec l'intérieur du pieds gauche",
    "de l'intérieur du pieds droit",
    "avec l'intérieur du pieds droit",
    "de la pointe de pieds droit",
    "de la pointe du pieds gauche",
    "avec la pointe du pieds gauche",
    "avec la pointe du pieds droit",
    "5m devant",
    "en face",
    "devant moi",
    "devant lui",
    "visant le pieds droit",
    "visant le pieds gauche"
  ];

  // Normaliser le texte pour éviter les différences de majuscules/minuscules
  const texteMin = texte.toLowerCase();
  // Vérifier si le texte contient au moins un des mots-clés
  const reconnus = motsCles.filter(mot => texteMin.includes(mot));
  if (reconnus.length > 0) {
    await ovl.sendMessage(ms_org, {
      video: { url: "https://files.catbox.moe/zqm7et.mp4" },
      gifPlayback: true,
      caption: `*⚽✅Passe réussie !🔷*5 Exercices restants   : ${reconnus.join(", ")}`
    });
    return `✅ Texte analysé :\n${texte}\n\n🔑 Mots-clés reconnus : ${reconnus.join(", ")}`;
  } else {
    return "❌ Aucun mot-clé reconnu dans le texte.";
  }
}
