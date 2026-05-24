export async function getGroqChatCompletion(messages: { role: string; content: string }[]) {
  const apiKey = process.env.GROQ_API_KEY || "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";
  const model = "llama-3.1-8b-instant";

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || "Groq API call failed");
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || "";
}
