"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import { Save, User, Users, Briefcase, Target, Calendar, ChevronRight } from "lucide-react";
import { toast } from "sonner";

type Child = {
  name: string;
  nickname: string;
  birthday: string | null;
  notes: string;
};

type Project = {
  name: string;
  status: string;
  priority: string;
  deadline: string | null;
  description: string;
};

type Goal = {
  goal: string;
  priority: string;
  deadline: string | null;
};

type Milestone = {
  title: string;
  date: string;
  project: string;
};

export default function SettingsPage() {
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"identity" | "children" | "projects" | "goals">("identity");
  
  // Formulaires
  const [newChild, setNewChild] = useState<Child>({ name: "", nickname: "", birthday: null, notes: "" });
  const [newProject, setNewProject] = useState<Project>({ name: "", status: "active", priority: "normal", deadline: null, description: "" });
  const [newGoal, setNewGoal] = useState<Goal>({ goal: "", priority: "high", deadline: null });
  const [newMilestone, setNewMilestone] = useState<Milestone>({ title: "", date: "", project: "" });

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    setIsLoading(true);
    const response = await fetch("https://sovereign-bridge.onrender.com/api/profile");
    const data = await response.json();
    if (data.success) {
      setProfile(data.profile);
    }
    setIsLoading(false);
  }

  async function updateProfile(updates: any) {
    setIsSaving(true);
    const response = await fetch("https://sovereign-bridge.onrender.com/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates)
    });
    const data = await response.json();
    if (data.success) {
      setProfile(data.profile);
      toast.success("Profil mis à jour");
    } else {
      toast.error("Erreur: " + data.error);
    }
    setIsSaving(false);
  }

  async function addChild() {
    if (!newChild.name) return;
    const response = await fetch("https://sovereign-bridge.onrender.com/api/profile/children", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newChild)
    });
    const data = await response.json();
    if (data.success) {
      setProfile({ ...profile, children: data.children });
      setNewChild({ name: "", nickname: "", birthday: null, notes: "" });
      toast.success("Enfant ajouté");
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      <h1 className="text-3xl font-serif text-gold-500 mb-2">Settings</h1>
      <p className="text-gray-500 text-sm mb-8">Manage your profile and what Becks knows about you</p>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10 mb-6">
        <button
          onClick={() => setActiveTab("identity")}
          className={`px-4 py-2 text-sm flex items-center gap-2 transition-colors ${activeTab === "identity" ? "text-gold-500 border-b-2 border-gold-500" : "text-gray-400 hover:text-white"}`}
        >
          <User className="w-4 h-4" /> Identity
        </button>
        <button
          onClick={() => setActiveTab("children")}
          className={`px-4 py-2 text-sm flex items-center gap-2 transition-colors ${activeTab === "children" ? "text-gold-500 border-b-2 border-gold-500" : "text-gray-400 hover:text-white"}`}
        >
          <Users className="w-4 h-4" /> Children
        </button>
        <button
          onClick={() => setActiveTab("projects")}
          className={`px-4 py-2 text-sm flex items-center gap-2 transition-colors ${activeTab === "projects" ? "text-gold-500 border-b-2 border-gold-500" : "text-gray-400 hover:text-white"}`}
        >
          <Briefcase className="w-4 h-4" /> Projects
        </button>
        <button
          onClick={() => setActiveTab("goals")}
          className={`px-4 py-2 text-sm flex items-center gap-2 transition-colors ${activeTab === "goals" ? "text-gold-500 border-b-2 border-gold-500" : "text-gray-400 hover:text-white"}`}
        >
          <Target className="w-4 h-4" /> Goals & Milestones
        </button>
      </div>

      {/* Identity Tab */}
      {activeTab === "identity" && profile && (
        <div className="space-y-6">
          <div className="bg-white/5 rounded-xl p-6">
            <label className="block text-sm text-gray-400 mb-2">Preferred name</label>
            <input
              type="text"
              value={profile.preferred_name || "Rebecca"}
              onChange={(e) => setProfile({ ...profile, preferred_name: e.target.value })}
              className="w-full bg-white/10 border border-white/10 rounded-lg px-4 py-2 text-ivory focus:outline-none focus:border-gold-500"
            />
          </div>
          
          <div className="bg-white/5 rounded-xl p-6">
            <label className="block text-sm text-gray-400 mb-2">Birthday</label>
            <input
              type="date"
              value={profile.birthday || ""}
              onChange={(e) => setProfile({ ...profile, birthday: e.target.value })}
              className="w-full bg-white/10 border border-white/10 rounded-lg px-4 py-2 text-ivory focus:outline-none focus:border-gold-500"
            />
          </div>
          
          <button
            onClick={() => updateProfile({ preferred_name: profile.preferred_name, birthday: profile.birthday })}
            disabled={isSaving}
            className="w-full py-3 bg-gold-500 text-midnight rounded-xl font-medium hover:bg-gold-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" /> Save Identity
          </button>
        </div>
      )}

      {/* Children Tab */}
      {activeTab === "children" && (
        <div className="space-y-6">
          <div className="space-y-3">
            {profile?.children?.map((child: Child, idx: number) => (
              <div key={idx} className="bg-white/5 rounded-xl p-4">
                <p className="text-ivory font-medium">{child.name}</p>
                {child.nickname && <p className="text-xs text-gray-500">Nickname: {child.nickname}</p>}
                {child.birthday && <p className="text-xs text-gray-500">Birthday: {child.birthday}</p>}
              </div>
            ))}
          </div>
          
          <div className="bg-white/5 rounded-xl p-6">
            <h3 className="text-gold-500 text-sm mb-4">Add a child</h3>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Full name"
                value={newChild.name}
                onChange={(e) => setNewChild({ ...newChild, name: e.target.value })}
                className="w-full bg-white/10 border border-white/10 rounded-lg px-4 py-2 text-ivory focus:outline-none focus:border-gold-500"
              />
              <input
                type="text"
                placeholder="Nickname (optional)"
                value={newChild.nickname}
                onChange={(e) => setNewChild({ ...newChild, nickname: e.target.value })}
                className="w-full bg-white/10 border border-white/10 rounded-lg px-4 py-2 text-ivory focus:outline-none focus:border-gold-500"
              />
              <input
                type="date"
                placeholder="Birthday"
                value={newChild.birthday || ""}
                onChange={(e) => setNewChild({ ...newChild, birthday: e.target.value })}
                className="w-full bg-white/10 border border-white/10 rounded-lg px-4 py-2 text-ivory focus:outline-none focus:border-gold-500"
              />
              <textarea
                placeholder="Notes (allergies, school, etc.)"
                value={newChild.notes}
                onChange={(e) => setNewChild({ ...newChild, notes: e.target.value })}
                className="w-full bg-white/10 border border-white/10 rounded-lg px-4 py-2 text-ivory focus:outline-none focus:border-gold-500"
                rows={2}
              />
              <button
                onClick={addChild}
                className="w-full py-2 bg-gold-500/20 text-gold-500 rounded-lg text-sm hover:bg-gold-500/30 transition-colors"
              >
                + Add Child
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Projects Tab */}
      {activeTab === "projects" && (
        <div className="space-y-6">
          <div className="space-y-3">
            {profile?.projects?.map((project: Project, idx: number) => (
              <div key={idx} className="bg-white/5 rounded-xl p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-ivory font-medium">{project.name}</p>
                    <div className="flex gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${project.status === "active" ? "bg-emerald-500/20 text-emerald-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                        {project.status}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${project.priority === "high" ? "bg-red-500/20 text-red-400" : project.priority === "critical" ? "bg-red-500/20 text-red-400" : "bg-blue-500/20 text-blue-400"}`}>
                        {project.priority}
                      </span>
                    </div>
                    {project.deadline && <p className="text-xs text-gray-500 mt-2">📅 {project.deadline}</p>}
                    {project.description && <p className="text-xs text-gray-400 mt-2">{project.description}</p>}
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Goals Tab */}
      {activeTab === "goals" && (
        <div className="space-y-6">
          <div className="space-y-3">
            <h3 className="text-gold-500 text-sm">Current Goals</h3>
            {profile?.current_goals?.map((goal: Goal, idx: number) => (
              <div key={idx} className="bg-white/5 rounded-xl p-4">
                <p className="text-ivory text-sm">{goal.goal}</p>
                <div className="flex gap-2 mt-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${goal.priority === "high" ? "bg-red-500/20 text-red-400" : "bg-blue-500/20 text-blue-400"}`}>
                    {goal.priority}
                  </span>
                  {goal.deadline && <span className="text-xs text-gray-500">📅 {goal.deadline}</span>}
                </div>
              </div>
            ))}
          </div>
          
          <div className="space-y-3">
            <h3 className="text-gold-500 text-sm">Upcoming Milestones</h3>
            {profile?.upcoming_milestones?.map((milestone: Milestone, idx: number) => (
              <div key={idx} className="bg-white/5 rounded-xl p-4">
                <p className="text-ivory text-sm">{milestone.title}</p>
                <div className="flex gap-2 mt-2">
                  <span className="text-xs text-gray-500">📅 {milestone.date}</span>
                  <span className="text-xs text-gold-500">{milestone.project}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
