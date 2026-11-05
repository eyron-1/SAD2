import { supabase } from "./supabaseClient";

function cleanAIResponse(text) {
  return text
    .replace(/```(?:[\w+-]+)?\s*\n?([\s\S]*?)```/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/([*_])([^*_]+)\1/g, "$2")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^\s*[-*+•‣]\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/^\s*[-*_]{3,}\s*$/gm, "")
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function requestAIAssistant({ mode, messages, context }) {
  const { data, error } = await supabase.functions.invoke("ai-assistant", {
    body: { mode, messages, context },
  });

  if (error) {
    let message = error.message || "The AI service could not complete the request.";
    if (error.context instanceof Response) {
      const errorBody = await error.context.clone().json().catch(() => null);
      if (errorBody?.error) message = errorBody.error;
    }
    throw new Error(message);
  }

  if (!data?.text) {
    throw new Error(data?.error || "The AI service returned an empty response.");
  }

  return cleanAIResponse(data.text);
}
