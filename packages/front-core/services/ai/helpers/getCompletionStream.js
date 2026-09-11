export const getCompletionStream = async (prompt, abortSignal) => {
  const config = getConfig();

  const { codeLlamaModelName, codeLlamaApiUrl } = config.ai || {};

  if (!codeLlamaModelName || !codeLlamaApiUrl) {
    throw new Error('Code Llama model name or API URL is not defined in the configuration.');
  }

  const data = {
    model: codeLlamaModelName,
    raw: true,
    prompt: prompt,
    options: {
      temperature: 0.2,
      num_predict: 100,
    },
  };

  const response = await fetch(`${codeLlamaApiUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    signal: abortSignal,
  });

  if (!response.ok || !response.body) {
    throw Error('Error while making line generator request');
  }
  
  return response.body.getReader();
}