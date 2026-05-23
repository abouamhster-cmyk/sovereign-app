"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Trash2, Edit2, Save, X, Mail, MessageCircle, Send, Clock, Calendar } from "lucide-react";
import { toast } from "sonner";

type AutoReplyRule = {
  id: string;
  trigger_type: "whatsapp" | "email" | "sms";
  trigger_keyword: string;
  trigger_exact_match: boolean;
  response_type: "text" | "template";
  response_content: string;
  priority: number;
  is_active: boolean;
  schedule_start?: string;
  schedule_end?: string;
  days_of_week?: number[];
  created_at: string;
};

const triggerTypes = [
  { value: "whatsapp", label: "📱 WhatsApp", icon: MessageCircle },
  { value: "email", label: "📧 Email", icon: Mail },
  { value: "sms", label: "💬 SMS", icon: Send }
];

const daysOfWeek = [
  "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"
];

export default function AutoRepliesPage() {
  const { user } = useAuth();
  const userId = user?.id || null;
  const [rules, setRules] = useState<AutoReplyRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    trigger_type: "whatsapp" as "whatsapp" | "email" | "sms",
    trigger_keyword: "",
    trigger_exact_match: false,
    response_type: "text" as "text" | "template",
    response_content: "",
    priority: 5,
    is_active: true,
    schedule_start: "",
    schedule_end: "",
    days_of_week: [] as number[]
  });

  useEffect(() => {
    if (userId) fetchRules();
  }, [userId]);

  async function fetchRules() {
    if (!userId) return;
    
    const { data } = await supabase
      .from("auto_reply_rules")
      .select("*")
      .eq("user_id", userId)
      .order("priority", { ascending: true });
    
    setRules(data || []);
    setIsLoading(false);
  }

  async function saveRule() {
    if (!userId) return;
    
    const data = {
      trigger_type: formData.trigger_type,
      trigger_keyword: formData.trigger_keyword.toLowerCase(),
      trigger_exact_match: formData.trigger_exact_match,
      response_type: formData.response_type,
      response_content: formData.response_content,
      priority: formData.priority,
      is_active: formData.is_active,
      schedule_start: formData.schedule_start || null,
      schedule_end: formData.schedule_end || null,
      days_of_week: formData.days_of_week.length ? formData.days_of_week : null,
      user_id: userId
    };
    
    let error;
    if (editingId) {
      const result = await supabase.from("auto_reply_rules").update(data).eq("id", editingId);
      error = result.error;
    } else {
      const result = await supabase.from("auto_reply_rules").insert(data);
      error = result.error;
    }
    
    if (!error) {
      resetForm();
      fetchRules();
      toast.success(editingId ? "Règle modifiée" : "Règle ajoutée");
    } else {
      toast.error("Erreur: " + error.message);
    }
  }

  async function deleteRule(id: string) {
    if (confirm("Supprimer cette règle ?")) {
      const { error } = await supabase.from("auto_reply_rules").delete().eq("id", id);
      if (!error) {
        fetchRules();
        toast.success("Règle supprimée");
      }
    }
  }

  async function toggleRule(id: string, currentStatus: boolean) {
    const { error } = await supabase
      .from("auto_reply_rules")
      .update({ is_active: !currentStatus })
      .eq("id", id);
    
    if (!error) fetchRules();
  }

  function editRule(rule: AutoReplyRule) {
    setFormData({
      trigger_type: rule.trigger_type,
      trigger_keyword: rule.trigger_keyword,
      trigger_exact_match: rule.trigger_exact_match,
      response_type: rule.response_type,
      response_content: rule.response_content,
      priority: rule.priority,
      is_active: rule.is_active,
      schedule_start: rule.schedule_start || "",
      schedule_end: rule.schedule_end || "",
      days_of_week: rule.days_of_week || []
    });
    setEditingId(rule.id);
    setShowForm(true);
  }

  function resetForm() {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      trigger_type: "whatsapp",
      trigger_keyword: "",
      trigger_exact_match: false,
      response_type: "text",
      response_content: "",
      priority: 5,
      is_active: true,
      schedule_start: "",
      schedule_end: "",
      days_of_week: []
    });
  }

  const toggleDay = (dayIndex: number) => {
    setFormData(prev => ({
      ...prev,
      days_of_week: prev.days_of_week.includes(dayIndex)
        ? prev.days_of_week.filter(d => d !== dayIndex)
        : [...prev.days_of_week, dayIndex]
    }));
  };

  const getTriggerIcon = (type: string) => {
    switch(type) {
      case "whatsapp": return <MessageCircle className="w-4 h-4 text-green-400" />;
      case "email": return <Mail className="w-4 h-4 text-blue-400" />;
      default: return <Send className="w-4 h-4 text-purple-400" />;
    }
  };

  if (!userId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-500">Veuillez vous connecter</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-y-auto bg-midnight p-4 md:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto w-full">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-serif text-gold-500 tracking-tight">
              Réponses automatiques
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Configurez les réponses automatiques pour WhatsApp, Email et SMS
            </p>
          </div>
          <button
            onClick={() => { setShowForm(true); setEditingId(null); resetForm(); }}
            className="bg-gold-500 text-midnight px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 hover:bg-gold-400 transition-colors"
          >
            <Plus className="w-4 h-4" /> Nouvelle règle
          </button>
        </div>

        {/* FORMULAIRE */}
        {showForm && (
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-serif text-ivory">{editingId ? "Modifier" : "Nouvelle"} règle</h3>
              <button onClick={resetForm} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Type de trigger */}
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-400 mb-2">Type de message</label>
                <div className="flex gap-3">
                  {triggerTypes.map(type => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.value}
                        onClick={() => setFormData({ ...formData, trigger_type: type.value as any })}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                          formData.trigger_type === type.value
                            ? "bg-gold-500/20 text-gold-500 border border-gold-500/50"
                            : "bg-white/5 text-gray-400 hover:bg-white/10"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {type.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Mot-clé déclencheur */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Mot-clé déclencheur</label>
                <input
                  type="text"
                  placeholder="ex: merci, ok, bonjour"
                  value={formData.trigger_keyword}
                  onChange={(e) => setFormData({ ...formData, trigger_keyword: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory focus:outline-none focus:border-gold-500"
                />
              </div>

              {/* Correspondance exacte */}
              <div className="flex items-center gap-3 pt-8">
                <input
                  type="checkbox"
                  id="exactMatch"
                  checked={formData.trigger_exact_match}
                  onChange={(e) => setFormData({ ...formData, trigger_exact_match: e.target.checked })}
                  className="w-4 h-4 rounded border-white/20 bg-white/5 text-gold-500"
                />
                <label htmlFor="exactMatch" className="text-sm text-gray-400">
                  Correspondance exacte (sinon mot-clé contenu dans le message)
                </label>
              </div>

              {/* Réponse */}
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-400 mb-2">Réponse</label>
                <textarea
                  placeholder="Message de réponse automatique"
                  value={formData.response_content}
                  onChange={(e) => setFormData({ ...formData, response_content: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory focus:outline-none focus:border-gold-500"
                  rows={3}
                />
              </div>

              {/* Priorité */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Priorité (1-10)</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory focus:outline-none focus:border-gold-500"
                />
                <p className="text-xs text-gray-500 mt-1">Plus le chiffre est bas, plus la priorité est haute</p>
              </div>

              {/* Activation */}
              <div className="flex items-center gap-3 pt-8">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 rounded border-white/20 bg-white/5 text-gold-500"
                />
                <label htmlFor="isActive" className="text-sm text-gray-400">Règle active</label>
              </div>

              {/* Planification */}
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-400 mb-2">Planification (optionnel)</label>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="datetime-local"
                    placeholder="Début"
                    value={formData.schedule_start}
                    onChange={(e) => setFormData({ ...formData, schedule_start: e.target.value })}
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory"
                  />
                  <input
                    type="datetime-local"
                    placeholder="Fin"
                    value={formData.schedule_end}
                    onChange={(e) => setFormData({ ...formData, schedule_end: e.target.value })}
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory"
                  />
                </div>
              </div>

              {/* Jours de la semaine */}
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-400 mb-2">Jours d'activation</label>
                <div className="flex flex-wrap gap-2">
                  {daysOfWeek.map((day, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => toggleDay(idx)}
                      className={`px-3 py-1.5 rounded-full text-xs transition-colors ${
                        formData.days_of_week.includes(idx)
                          ? "bg-gold-500/20 text-gold-500 border border-gold-500/50"
                          : "bg-white/5 text-gray-400 hover:bg-white/10"
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">Laissez vide pour tous les jours</p>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button onClick={saveRule} className="bg-gold-500 text-midnight px-6 py-2 rounded-full font-medium hover:bg-gold-400 transition-colors flex items-center gap-2">
                <Save className="w-4 h-4" />
                {editingId ? "Mettre à jour" : "Enregistrer"}
              </button>
              <button onClick={resetForm} className="bg-white/10 px-6 py-2 rounded-full hover:bg-white/20 transition-colors">Annuler</button>
            </div>
          </div>
        )}

        {/* LISTE DES RÈGLES */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center py-12"><Loader2 className="w-8 h-8 text-gold-500 animate-spin mx-auto" /></div>
          ) : rules.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>Aucune règle de réponse automatique</p>
              <p className="text-sm mt-2">Cliquez sur "Nouvelle règle" pour commencer</p>
            </div>
          ) : (
            rules.map((rule) => (
              <div key={rule.id} className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap mb-2">
                      {getTriggerIcon(rule.trigger_type)}
                      <span className="text-gold-500 font-mono text-sm">"{rule.trigger_keyword}"</span>
                      <span className="text-xs text-gray-500">
                        {rule.trigger_exact_match ? "Correspondance exacte" : "Contient"}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${rule.is_active ? "bg-emerald-500/20 text-emerald-400" : "bg-gray-500/20 text-gray-400"}`}>
                        {rule.is_active ? "Actif" : "Inactif"}
                      </span>
                      <span className="text-xs text-gray-500">Priorité: {rule.priority}</span>
                    </div>
                    <p className="text-ivory text-sm">{rule.response_content}</p>
                    {rule.schedule_start && (
                      <p className="text-xs text-gray-500 mt-2 flex items-center gap-2">
                        <Calendar className="w-3 h-3" />
                        Planifié du {new Date(rule.schedule_start).toLocaleString()} au {rule.schedule_end ? new Date(rule.schedule_end).toLocaleString() : "illimité"}
                      </p>
                    )}
                    {rule.days_of_week && rule.days_of_week.length > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        Actif les : {rule.days_of_week.map(d => daysOfWeek[d]).join(", ")}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleRule(rule.id, rule.is_active)}
                      className={`px-3 py-1 rounded-full text-xs ${
                        rule.is_active
                          ? "bg-gray-500/20 text-gray-400 hover:bg-gray-500/30"
                          : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                      }`}
                    >
                      {rule.is_active ? "Désactiver" : "Activer"}
                    </button>
                    <button onClick={() => editRule(rule)} className="text-gray-500 hover:text-gold-500">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteRule(rule.id)} className="text-gray-500 hover:text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
