import { getLastSavedRevision, getCommitDetails, saveLastRevision, getChangelist } from '../utils/svnUtils.js';
import { sendToWebhook } from '../utils/webhookUtils.js';
import { getRandomIndex } from '../utils/helpers.js';
import config from '../config/config.json' assert { type: "json" };

const authorCustomizations = {
  "GuilhermeL": {
    emotes: ["🐙", "⚡", "<:tortoise:1332037389455065148> <:tortoise:1332037305388634254>"],
    messages: ["Braaaanncchh!", "Agora vai..!", "Demorei mas entreguei"]
  },
  "JuniorD": {
      emotes: ["🔥", "🧯", "📱"],
      messages: ["Junior fez um commit quente!", "Apagando incêndio do último commit!", "Mais um commit do Mobile da Silva!"]
  },
  "Gustavo.Siega": {
      emotes: ["💡", "📝", "✨"],
      messages: ["Trazendo novas ideias!", "Agora com 200% mais relatórios!", "Novas implementações! Espero que funcionem..."]
  },
  "SidineyT": {
      emotes: ["⚠️", "🛠️", "🔍"],
      messages: ["Ajustando detalhes técnicos!", "Mais uma melhoria!", "Código revisado e otimizado!"]
  },
  "LuizF": {
      emotes: ["🎯", "🚀", "🔝"],
      messages: ["Focado no objetivo!", "Commit com precisão cirúrgica!", "Mais um passo para a perfeição!"]
  },
  "SamuelS": {
      emotes: ["🦧", "😎", "🐢"],
      messages: ["Samuel estragou o código!", "Ainda dá erro, mas não em tela", "demorei, mas pelo menos não é bug... eu acho."]
  },
  "JakelineV": {
      emotes: ["🐛✨", "🤡", "😬"],
      messages: ["Nova versão, novos bugs!", "O que poderia dar errado?", "Agora é tarde para voltar atrás!"]
  },	
};

function formatChangeList(files) {
  return files.length ? `${files.length} arquivo(s)\n${files.join('\n')}` : "Nenhum";
}

async function monitorSVN() {
  let lastCheckedRevision = getLastSavedRevision();

  while (true) {
    console.log("Iniciando verificação...");

    const nextRevision = lastCheckedRevision + 1;
    console.log(`Verificando a revisão #${nextRevision}...`);

    const commitDetails = getCommitDetails(nextRevision);
    if (!commitDetails) {
      console.log(`Nenhuma nova revisão detectada na #${nextRevision}.`);
      await waitNextCheck();
      continue;
    }

    console.log(`Nova revisão detectada: #${nextRevision}`);
    const changelistDict = getChangelist(nextRevision);

    const defaultEmote = "🔹";
    const defaultMessage = "Novo commit registrado!";
    const authorInfo = authorCustomizations[commitDetails.author] || {
      emotes: [defaultEmote],
      messages: [defaultMessage]
    };
    
    for (const [index, webhookUrl] of config.webhookUrls.entries()) {
      let emote;      
      if (commitDetails.author === "GuilhermeL") {
        const chosen = authorInfo.emotes[getRandomIndex(authorInfo.emotes)];
        if (chosen === "<:tortoise:1332037389455065148> <:tortoise:1332037305388634254>") {
          const parts = chosen.split(" ");
          if (webhookUrl === config.webhookUrls[0]) {
            emote = parts[0];
          } else {
            emote = parts[1];
          }
        } else {
          emote = chosen;
        }
      } else {
        if (Array.isArray(authorInfo.emotes)) {
          emote = authorInfo.emotes[getRandomIndex(authorInfo.emotes)];
        } else {
          emote = authorInfo.emotes[webhookUrl] || defaultEmote;
        }
      }

      const message = authorInfo.messages[getRandomIndex(authorInfo.messages)];

      const payload = {
        embeds: [
          {
            title: `${emote} SAG7 - 7.1.09 - Commit por ${commitDetails.author} - Revisão #${nextRevision} ${emote}`,
            color: 621992,
            description: `${message}\n\n${commitDetails.message}`,
            fields: [
              { name: 'Adicionado', value: formatChangeList(changelistDict.added), inline: true },
              { name: 'Modificado', value: formatChangeList(changelistDict.modified), inline: true },
              { name: 'Deletado', value: formatChangeList(changelistDict.deleted), inline: true }
            ],
            timestamp: commitDetails.date
          }
        ]
      };

      await sendToWebhook(payload, index);
    }

    saveLastRevision(nextRevision);
    lastCheckedRevision = nextRevision;
    await waitNextCheck();
  }
}

async function waitNextCheck() {
  return new Promise(resolve => setTimeout(resolve, config.checkInterval));
}

monitorSVN();
