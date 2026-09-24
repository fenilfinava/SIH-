import { supabase } from "./supabase";

export async function saveActivityHistory(userId: string, type: "Camera" | "Soil" | "Advisor", title: string, description: string) {
  try {
    await supabase.from("activity_history").insert({
      user_id: userId,
      activity_type: type,
      title: title,
      description: (description || '').substring(0, 800) // Keep it brief
    });
  } catch (e) {
    console.error("History Save Error:", e);
  }
}
