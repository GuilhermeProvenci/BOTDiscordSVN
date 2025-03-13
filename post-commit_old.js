import { execSync } from 'child_process';
import fs from 'fs';
import fetch from 'node-fetch';
import xml2js from 'xml2js';

const webhookUrls = [
    "https://discord.com/api/webhooks/1274082243718942720/R7xRKAhUP_cQ3hyVPwqzyFKq05KuKpbLlaMu-BRDX4EnyacxsBKwL6F38gXv-PoGF59C",
     "https://discord.com/api/webhooks/1290646751908335677/uTXWpBQF6rY9lghwU_7Qznt0BFUfagL0QaaqQQqRHhRdfhay3PJ-oyw2XOuvQVsu3cGD"
];

const svnPath = "svn";
const repoUrl = "D:/SAG";
const checkInterval = 30000;
const revisionFilePath = "./revision.json";

// const emotes = ["🐢", "🔥", "🛠️", "💾", "📂", "⚙️", "🐙"];

// function getRandomEmote() {
//     return emotes[Math.floor(Math.random() * emotes.length)];
// }

function getLastSavedRevision() {
    console.log(`Buscando revisão salva...`);
    if (fs.existsSync(revisionFilePath)) {
        try {
            const data = fs.readFileSync(revisionFilePath, 'utf8');
            return JSON.parse(data).revision || 0;
        } catch (error) {
            console.error("Erro ao ler o arquivo de revisão:", error.message);
        }
    }

    return getLatestSvnRevision();
}

function getLatestSvnRevision() {
    try {
        const command = `"${svnPath}" info --xml "${repoUrl}"`;
        const result = execSync(command, { encoding: 'utf8' }).trim();
        const parsedData = new xml2js.Parser({ explicitArray: false });
        let lastRevision = 0;

        parsedData.parseString(result, (err, data) => {
            if (err) throw err;
            lastRevision = parseInt(data.info.entry.commit.$.revision, 10);
        });

        return lastRevision;
    } catch (error) {
        console.error("Erro ao obter a última revisão do SVN:", error.message);
        return 0;
    }
}

function saveLastRevision(revision) {
    try {
        fs.writeFileSync(revisionFilePath, JSON.stringify({ revision }, null, 2), 'utf8');
    } catch (error) {
        console.error("Erro ao salvar a revisão:", error.message);
    }
}

function getCommitDetails(revisionId) {
    try {
        const command = `"${svnPath}" log -r ${revisionId} --xml "${repoUrl}"`;
        const result = execSync(command, { encoding: 'utf8' }).trim();
        const parsedData = new xml2js.Parser({ explicitArray: false });
        let details = {};

        parsedData.parseString(result, (err, data) => {
            if (err) throw err;
            const entry = data.log.logentry;
            details = {
                author: entry.author || "Desconhecido",
                message: entry.msg || "Sem mensagem",
                date: entry.date || new Date().toISOString()
            };
        });

        return details;
    } catch (error) {
        console.error(`Erro ao obter detalhes do commit #${revisionId}:`, error.message);
        return null;
    }
}

function getChangelist(revisionId) {
    try {
        const command = `"${svnPath}" diff -r ${revisionId - 1}:${revisionId} --summarize "${repoUrl}"`;
        const result = execSync(command, { encoding: 'utf8' }).trim();
        return parseChangelist(result);
    } catch (error) {
        console.error(`Erro ao obter lista de mudanças na revisão #${revisionId}:`, error.message);
        return { added: [], modified: [], deleted: [] };
    }
}

function parseChangelist(raw) {
    const changes = { added: [], modified: [], deleted: [] };
    raw.split('\n').forEach(line => {
        const [changeType, ...filePath] = line.trim().split(/\s+/);
        const file = filePath.join(' ');

        switch (changeType) {
            case 'A': changes.added.push(file); break;
            case 'M': changes.modified.push(file); break;
            case 'D': changes.deleted.push(file); break;
        }
    });

    return changes;
}

async function sendToWebhook(payload) {
    for (const url of webhookUrls) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error(`Erro HTTP! Status: ${response.status}`);
            console.log(`Webhook enviado com sucesso para ${url}! Código ${response.status}`);
        } catch (error) {
            console.error(`Erro ao enviar webhook para ${url}:`, error.message);
        }
    }
}

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

function getRandomIndex(arr) {
    return Math.floor(Math.random() * arr.length);
}

async function monitorSVN() {
    let lastCheckedRevision = getLastSavedRevision();

    while (true) {
        console.log(`Iniciando verificação...`);

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

        const randomIndex = getRandomIndex(authorInfo.emotes);        

        const selectedEmote = authorInfo.emotes[randomIndex];
        const selectedMessage = authorInfo.messages[randomIndex];

        const payload = {
            embeds: [
                {
                    title: `${selectedEmote} SAG7 - 7.1.09 - Commit por ${commitDetails.author} - Revisão #${nextRevision} ${selectedEmote}`,
                    color: 621992,
                    description: `${selectedMessage}\n\n${commitDetails.message}`,
                    fields: [
                        { name: 'Adicionado', value: formatChangeList(changelistDict.added), inline: true },
                        { name: 'Modificado', value: formatChangeList(changelistDict.modified), inline: true },
                        { name: 'Deletado', value: formatChangeList(changelistDict.deleted), inline: true }
                    ],
                    timestamp: commitDetails.date
                }
            ]
        };

        await sendToWebhook(payload);
        saveLastRevision(nextRevision);
        lastCheckedRevision = nextRevision;

        await waitNextCheck();
    }
}

function formatChangeList(files) {
    return files.length ? `${files.length} arquivo(s)\n${files.join('\n')}` : "Nenhum";
}

async function waitNextCheck() {
    console.log(`Aguardando ${checkInterval / 1000} segundos para a próxima verificação...`);
    await new Promise(resolve => setTimeout(resolve, checkInterval));
}

monitorSVN().catch(error => {
    console.error(`Falha ao iniciar o monitoramento SVN:`, error.message);
});





/*

async function monitorSVN() {
    let lastCheckedRevision = getLastSavedRevision();

    while (true) {
        console.log("Iniciando verificação...");
        
        const nextRevision = lastCheckedRevision + 1;
        console.log(Verificando a revisão #${nextRevision}...);
        
        const commitDetails = getCommitDetails(nextRevision);
        if (commitDetails) {
            console.log(Nova revisão detectada: ${nextRevision});

            const user = commitDetails.author || "Desconhecido";
            const log = commitDetails.message || "Sem mensagem";
            const date = commitDetails.date || new Date().toISOString();

            const changelistDict = getChangelist(nextRevision);
            
            const Emote = getRandomEmote();        

            const payload = {
                embeds: [
                    {
                        title: ${Emote} SAG7 - 7.1.09 - Commit por ${user} - Revisão #${nextRevision} ${Emote},
                        color: 621992,
                        description: log,
                        fields: [
                            { name: 'Adicionado', value: ${changelistDict.added.length} arquivo(s)\n${changelistDict.added.join('\n') || "Nenhum"}, inline: true },
                            { name: 'Modificado', value: ${changelistDict.modified.length} arquivo(s)\n${changelistDict.modified.join('\n') || "Nenhum"}, inline: true },
                            { name: 'Deletado', value: ${changelistDict.deleted.length} arquivo(s)\n${changelistDict.deleted.join('\n') || "Nenhum"}, inline: true }
                        ],
                        timestamp: date
                    }
                ]
            };

            await sendToWebhook(payload);

            lastCheckedRevision = nextRevision;
            saveLastRevision(lastCheckedRevision);
        } else {
            console.log(Nenhuma nova revisão detectada na #${nextRevision}.);
        }

        console.log(Aguardando ${checkInterval / 1000} segundos para a próxima verificação...);
        await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
}

*/