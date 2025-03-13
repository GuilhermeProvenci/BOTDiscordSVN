import { execSync } from 'child_process';
import fs from 'fs';
import xml2js from 'xml2js';
import config from '../config/config.json' assert { type: "json" };

export function getLastSavedRevision() {
  console.log("Buscando revisão salva...");
  if (fs.existsSync(config.revisionFilePath)) {
    try {
      const data = fs.readFileSync(config.revisionFilePath, 'utf8');
      const json = JSON.parse(data);
      return json.lastCheckedRevision || 0;
    } catch (error) {
      console.error("Erro ao ler o arquivo de revisão:", error.message);
    }
  }
  return getLatestSvnRevision();
}

export function getLatestSvnRevision() {
  try {
    const command = `"${config.svnPath}" info --xml "${config.repoUrl}"`;
    const result = execSync(command, { encoding: 'utf8' }).trim();
    const parser = new xml2js.Parser({ explicitArray: false });
    let lastRevision = 0;
    parser.parseString(result, (err, data) => {
      if (err) throw err;
      lastRevision = parseInt(data.info.entry.commit.$.revision, 10);
    });
    return lastRevision;
  } catch (error) {
    console.error("Erro ao obter a última revisão do SVN:", error.message);
    return 0;
  }
}

export function saveLastRevision(revision) {
  try {
    const data = { lastCheckedRevision: revision };
    fs.writeFileSync(config.revisionFilePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error("Erro ao salvar a revisão:", error.message);
  }
}

export function getCommitDetails(revision) {
  try {
    const command = `"${config.svnPath}" log -r ${revision} --xml "${config.repoUrl}"`;
    const result = execSync(command, { encoding: 'utf8' }).trim();
    const parser = new xml2js.Parser({ explicitArray: false });
    let details = {};
    parser.parseString(result, (err, data) => {
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
    console.error(`Erro ao obter detalhes do commit #${revision}:`, error.message);
    return null;
  }
}

export function getChangelist(revision) {
  try {
    const command = `"${config.svnPath}" diff -r ${revision - 1}:${revision} --summarize "${config.repoUrl}"`;
    const result = execSync(command, { encoding: 'utf8' }).trim();
    return parseChangelist(result);
  } catch (error) {
    console.error(`Erro ao obter lista de mudanças na revisão #${revision}:`, error.message);
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
