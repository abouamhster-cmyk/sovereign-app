import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// URL de ton backend Render
const BACKEND_URL = "https://sovereign-bridge.onrender.com";

export async function GET() {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Vérifier si un brief existe déjà aujourd'hui
    const { data: existing, error: checkError } = await supabase
      .from("daily_briefs")
      .select("id")
      .eq("date", today)
      .maybeSingle();
    
    if (checkError) {
      console.error("Erreur vérification brief:", checkError);
    }
    
    if (existing) {
      return NextResponse.json({ 
        message: "Brief déjà généré aujourd'hui",
        date: today,
        briefId: existing.id 
      });
    }
    
    // Récupérer les données contextuelles
    const [missionsRes, tasksRes, spendingRes, familyEventsRes, winsRes] = await Promise.all([
      supabase.from("missions").select("*").eq("status", "active"),
      supabase.from("tasks").select("*").neq("status", "done").limit(15),
      supabase.from("spending").select("amount").gte("date", today),
      supabase.from("family_events").select("*").gte("date", today),
      supabase.from("wins").select("*").gte("date", today)
    ]);
    
    const missions = missionsRes.data || [];
    const tasks = tasksRes.data || [];
    const familyEvents = familyEventsRes.data || [];
    const wins = winsRes.data || [];
    
    // Calcul des dépenses du jour
    const todaySpending = (spendingRes.data || []).reduce((sum, s) => sum + (s.amount || 0), 0);
    
    // Préparer le contexte pour l'IA
    const context = {
      today: today,
      missionsCount: missions.length,
      tasksCount: tasks.length,
      urgentTasksCount: tasks.filter(t => t.priority === "critical" || t.status === "today").length,
      familyEventsCount: familyEvents.length,
      todaySpending: todaySpending,
      winsToday: wins.length,
      activeMissions: missions.map(m => ({ name: m.name, priority: m.priority }))
    };
    
    // Appel à l'IA via le backend Render
    const aiResponse = await fetch(`${BACKEND_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          { 
            role: "user", 
            content: `Génère un brief quotidien motivant et stratégique pour Rebecca avec ces données: ${JSON.stringify(context)}. 
            
Retourne UNIQUEMENT du JSON valide avec cette structure exacte:
{
  "top_priorities": ["priorité 1", "priorité 2", "priorité 3"],
  "family_focus": "une phrase sur la priorité famille",
  "money_move": "une action financière concrète",
  "business_move": "une action business concrète",
  "stabilization_action": "une action pour protéger son énergie",
  "calm_guidance": "une phrase apaisante et encourageante"
}

Sois concise, pratique et bienveillante.`
          }
        ]
      })
    });
    
    const aiData = await aiResponse.json();
    
    // Extraire le JSON de la réponse
    let briefData;
    try {
      const jsonMatch = aiData.reply.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        briefData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Pas de JSON trouvé");
      }
    } catch (error) {
      console.error("Erreur parsing IA:", error);
      // Fallback si l'IA ne retourne pas de JSON valide
      briefData = {
        top_priorities: [
          "Vérifier les tâches prioritaires du jour",
          "Un point sur les finances",
          "Prendre un moment pour toi"
        ],
        family_focus: "Du temps de qualité avec les enfants",
        money_move: "Vérifier les dépenses du jour",
        business_move: "Avancer sur une mission clé",
        stabilization_action: "Prendre 10 minutes de pause",
        calm_guidance: "Une chose à la fois. Tu gères."
      };
    }
    
    // Sauvegarder le brief en base
    const { data: newBrief, error: insertError } = await supabase
      .from("daily_briefs")
      .insert({
        date: today,
        top_priorities: briefData.top_priorities || [],
        family_focus: briefData.family_focus || "",
        money_move: briefData.money_move || "",
        business_move: briefData.business_move || "",
        stabilization_action: briefData.stabilization_action || "",
        calm_guidance: briefData.calm_guidance || ""
      })
      .select()
      .single();
    
    if (insertError) {
      console.error("Erreur insertion brief:", insertError);
      return NextResponse.json({ 
        success: false, 
        error: insertError.message 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: "Brief généré avec succès",
      date: today,
      brief: newBrief
    });
    
  } catch (error) {
    console.error("Erreur API brief:", error);
    return NextResponse.json({ 
      success: false, 
      error: String(error) 
    }, { status: 500 });
  }
}

// Pour supporter POST aussi (appel manuel depuis l'interface)
export async function POST() {
  return GET();
}