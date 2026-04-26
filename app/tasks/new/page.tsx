"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Save, X } from "lucide-react";
import Link from "next/link";

export default function NewTaskPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    status: "not_started",
    due_date: "",
    priority: "normal",
    project: "Ifè Farm",
    notes: ""
  });

  const projects = [
    "Ifè Farm",
    "Santé Plus",
    "Love & Fire",
    "Famille",
    "Personnel",
    "Bénin Relocation"
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await supabase.from("tasks").insert({
      title: formData.title,
      status: formData.status,
      due_date: formData.due_date || null,
      priority: formData.priority,
      project: formData.project,
      notes: formData.notes || null
    });

    if (!error) {
      router.push("/tasks");
    } else {
      alert("Erreur: " + error.message);
    }
    setIsLoading(false);
  }

  return (
    <div className="p-8 lg:p-12 h-full flex flex-col overflow-y-auto bg-midnight">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/tasks" className="text-gray-400 hover:text-gold-500 transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-3xl font-serif text-gold-500">Nouvelle tâche</h1>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        <div>
          <label className="block text-sm text-gray-400 mb-2">Titre *</label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Statut</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory"
            >
              <option value="not_started">⏳ À faire</option>
              <option value="today">📍 Aujourd'hui</option>
              <option value="in_progress">🔄 En cours</option>
              <option value="waiting">⏰ En attente</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Priorité</label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory"
            >
              <option value="critical">⚠️ Critique</option>
              <option value="high">🔴 Haute</option>
              <option value="normal">🟡 Normale</option>
              <option value="low">🟢 Basse</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Date d'échéance</label>
            <input
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Projet</label>
            <select
              value={formData.project}
              onChange={(e) => setFormData({ ...formData, project: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory"
            >
              {projects.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-2">Notes (optionnel)</label>
          <textarea
            rows={3}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={isLoading}
            className="bg-gold-500 text-midnight px-6 py-2 rounded-full font-medium hover:bg-gold-400 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {isLoading ? "Création..." : "Créer la tâche"}
          </button>
          <Link
            href="/tasks"
            className="bg-white/10 px-6 py-2 rounded-full hover:bg-white/20 transition-colors"
          >
            Annuler
          </Link>
        </div>
      </form>
    </div>
  );
}
