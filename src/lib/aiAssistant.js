import { supabase } from "./supabaseClient";

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

  return data.text;
}
