import fetch from 'node-fetch';
import config from '../config/config.json' assert { type: "json" };

export async function sendToWebhook(payload, index) {
  const webhookUrl = config.webhookUrls[index];
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Erro HTTP! Status: ${response.status}`);
    }
    console.log(`Webhook enviado com sucesso para ${webhookUrl}! Código ${response.status}`);
  } catch (error) {
    console.error(`Erro ao enviar webhook para ${webhookUrl}:`, error.message);
  }
}
