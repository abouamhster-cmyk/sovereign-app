"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { 
  User, Users, Briefcase, Target, Calendar, Save, 
  ChevronRight, X, Plus, Heart, Baby, Globe, Sprout, Trophy,
  Bell, Volume2, VolumeX, Vibrate, BellRing, Check, Loader2,
  Mail, Phone, MapPin, Clock, Shield, Eye, EyeOff, Settings,
  Edit2, Trash2
} from "lucide-react";
import { toast } from "sonner";

const API_URL = "https://sovereign-bridge.onrender.com";

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

type NotificationPreferences = {
  sound: boolean;
  vibration: boolean;
  morning_brief: boolean;
  task_reminders: boolean;
  mission_reminders: boolean;
  document_reminders: boolean;
  celebration_reminders: boolean;
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"identity" | "children" | "projects" | "goals" | "notifications">("identity");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [profile, setProfile] = useState<any>(null);
  
  const [identityForm, setIdentityForm] = useState({
    preferred_name: "Rebecca",
    full_name: "",
    birthday: "",
    email: "",
    phone: "",
    location: ""
  });
  
  const [children, setChildren] = useState<Child[]>([]);
  const [showChildForm, setShowChildForm] = useState(false);
  const [editingChildIndex, setEditingChildIndex] = useState<number | null>(null);
  const [newChild, setNewChild] = useState<Child>({ name: "", nickname: "", birthday: null, notes: "" });
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [editingProjectIndex, setEditingProjectIndex] = useState<number | null>(null);
  const [newProject, setNewProject] = useState<Project>({ name: "", status: "active", priority: "normal", deadline: null, description: "" });
  
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [editingGoalIndex, setEditingGoalIndex] = useState<number | null>(null);
  const [newGoal, setNewGoal] = useState<Goal>({ goal: "", priority: "normal", deadline: null });
  
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>({
    sound: true,
    vibration: true,
    morning_brief: true,
    task_reminders: true,
    mission_reminders: true,
    document_reminders: true,
    celebration_reminders: true
  });

  const availableProjects = [
    "Ifè Living Farm",
    "Love & Fire Sport", 
    "Santé Plus Services",
    "Bénin Relocation",
    "Personnel",
    "Famille"
  ];

  useEffect(() => {
    fetchProfile();
    loadLocalPreferences();
  }, []);

  async function fetchProfile() {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/profile`);
      const data = await response.json();
      if (data.success && data.profile) {
        setProfile(data.profile);
        
        setIdentityForm({
          preferred_name: data.profile.preferred_name || "Rebecca",
          full_name: data.profile.full_name || "",
          birthday: data.profile.birthday || "",
          email: data.profile.email || "",
          phone: data.profile.phone || "",
          location: data.profile.location || ""
        });
        
        setChildren(data.profile.children || []);
        setProjects(data.profile.projects || []);
        setGoals(data.profile.current_goals || []);
      }
    } catch (error) {
      console.error("Erreur fetch profile:", error);
    }
    setIsLoading(false);
  }

  function loadLocalPreferences() {
    const sound = localStorage.getItem("notif_sound");
    const vibration = localStorage.getItem("notif_vibrate");
    if (sound !== null) setNotifPrefs(prev => ({ ...prev, sound: sound === "true" }));
    if (vibration !== null) setNotifPrefs(prev => ({ ...prev, vibration: vibration === "true" }));
  }

  async function saveIdentity() {
    setIsSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preferred_name: identityForm.preferred_name,
          full_name: identityForm.full_name,
          birthday: identityForm.birthday,
          email: identityForm.email,
          phone: identityForm.phone,
          location: identityForm.location
        })
      });
      const data = await response.json();
      if (data.success) {
        setProfile(data.profile);
        toast.success("Profil mis à jour");
      } else {
        toast.error("Erreur: " + (data.error || "Inconnue"));
      }
    } catch (error) {
      console.error("Erreur saveIdentity:", error);
      toast.error("Erreur de connexion");
    }
    setIsSaving(false);
  }

  async function saveChildren() {
    setIsSaving(true);
    try {
      const cleanChildren = children.map(child => ({
        name: child.name || "",
        nickname: child.nickname || "",
        birthday: child.birthday || null,
        notes: child.notes || ""
      }));
      
      const response = await fetch(`${API_URL}/api/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ children: cleanChildren })
      });
      const data = await response.json();
      if (data.success) {
        setProfile(data.profile);
        toast.success("Enfants mis à jour");
      } else {
        toast.error("Erreur: " + (data.error || "Inconnue"));
      }
    } catch (error) {
      console.error("Erreur saveChildren:", error);
      toast.error("Erreur de connexion");
    }
    setIsSaving(false);
  }

async function saveProjects() {
  setIsSaving(true);
  try {
    // Nettoyer les données avant envoi
    const cleanProjects = projects.map(project => ({
      name: project.name || "",
      status: project.status || "active",
      priority: project.priority || "normal",
      deadline: project.deadline || null,
      description: project.description || ""
    }));
    
    const response = await fetch(`${API_URL}/api/profile`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projects: cleanProjects })
    });
    const data = await response.json();
    
    if (data.success) {
      setProfile(data.profile);
      toast.success("Projets mis à jour");
    } else {
      toast.error("Erreur: " + (data.error || "Inconnue"));
    }
  } catch (error) {
    console.error("Erreur saveProjects:", error);
    toast.error("Erreur de connexion");
  }
  setIsSaving(false);
}

  
  async function saveGoals() {
    setIsSaving(true);
    try {
      const cleanGoals = goals.map(goal => ({
        goal: goal.goal || "",
        priority: goal.priority || "normal",
        deadline: goal.deadline || null
      }));
      
      const response = await fetch(`${API_URL}/api/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_goals: cleanGoals })
      });
      const data = await response.json();
      if (data.success) {
        setProfile(data.profile);
        toast.success("Objectifs mis à jour");
      } else {
        toast.error("Erreur: " + (data.error || "Inconnue"));
      }
    } catch (error) {
      console.error("Erreur saveGoals:", error);
      toast.error("Erreur de connexion");
    }
    setIsSaving(false);
  }

  function addChild() {
    if (!newChild.name) {
      toast.error("Le nom est requis");
      return;
    }
    
    if (editingChildIndex !== null) {
      const updated = [...children];
      updated[editingChildIndex] = newChild;
      setChildren(updated);
      setEditingChildIndex(null);
    } else {
      setChildren([...children, newChild]);
    }
    
    setNewChild({ name: "", nickname: "", birthday: null, notes: "" });
    setShowChildForm(false);
    saveChildren();
  }

  function editChild(index: number) {
    setNewChild(children[index]);
    setEditingChildIndex(index);
    setShowChildForm(true);
  }

  function deleteChild(index: number) {
    if (confirm("Supprimer cet enfant ?")) {
      const updated = children.filter((_, i) => i !== index);
      setChildren(updated);
      saveChildren();
    }
  }

  function addProject() {
    if (!newProject.name) {
      toast.error("Le nom du projet est requis");
      return;
    }
    
    if (editingProjectIndex !== null) {
      const updated = [...projects];
      updated[editingProjectIndex] = newProject;
      setProjects(updated);
      setEditingProjectIndex(null);
    } else {
      setProjects([...projects, newProject]);
    }
    
    setNewProject({ name: "", status: "active", priority: "normal", deadline: null, description: "" });
    setShowProjectForm(false);
    saveProjects();
  }

  function editProject(index: number) {
    setNewProject(projects[index]);
    setEditingProjectIndex(index);
    setShowProjectForm(true);
  }

  function deleteProject(index: number) {
  if (confirm("Supprimer ce projet ?")) {
    const updated = projects.filter((_, i) => i !== index);
    setProjects(updated);
    // Attendre que le state soit mis à jour puis sauvegarder
    setTimeout(() => {
      const cleanProjects = updated.map(project => ({
        name: project.name || "",
        status: project.status || "active",
        priority: project.priority || "normal",
        deadline: project.deadline || null,
        description: project.description || ""
      }));
      
      fetch(`${API_URL}/api/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projects: cleanProjects })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setProfile(data.profile);
          toast.success("Projet supprimé");
        } else {
          toast.error("Erreur: " + (data.error || "Inconnue"));
          fetchProfile(); // Recharger en cas d'erreur
        }
      })
      .catch(err => {
        console.error("Erreur:", err);
        toast.error("Erreur de connexion");
        fetchProfile();
      });
    }, 100);
  }
}
  function addGoal() {
    if (!newGoal.goal) {
      toast.error("L'objectif est requis");
      return;
    }
    
    if (editingGoalIndex !== null) {
      const updated = [...goals];
      updated[editingGoalIndex] = newGoal;
      setGoals(updated);
      setEditingGoalIndex(null);
    } else {
      setGoals([...goals, newGoal]);
    }
    
    setNewGoal({ goal: "", priority: "normal", deadline: null });
    setShowGoalForm(false);
    saveGoals();
  }

  function editGoal(index: number) {
    setNewGoal(goals[index]);
    setEditingGoalIndex(index);
    setShowGoalForm(true);
  }

  function deleteGoal(index: number) {
    if (confirm("Supprimer cet objectif ?")) {
      const updated = goals.filter((_, i) => i !== index);
      setGoals(updated);
      saveGoals();
    }
  }

  function saveNotificationPreferences() {
    localStorage.setItem("notif_sound", String(notifPrefs.sound));
    localStorage.setItem("notif_vibrate", String(notifPrefs.vibration));
    toast.success("Préférences de notification sauvegardées");
  }

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case "critical": return "bg-red-500/20 text-red-400";
      case "high": return "bg-orange-500/20 text-orange-400";
      case "normal": return "bg-blue-500/20 text-blue-400";
      case "low": return "bg-gray-500/20 text-gray-400";
      default: return "bg-gray-500/20 text-gray-400";
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case "active": return "bg-emerald-500/20 text-emerald-400";
      case "planning": return "bg-purple-500/20 text-purple-400";
      case "paused": return "bg-yellow-500/20 text-yellow-400";
      case "complete": return "bg-gray-500/20 text-gray-400";
      default: return "bg-gray-500/20 text-gray-400";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-y-auto bg-midnight p-4 md:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto w-full">
        {/* HEADER */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="w-8 h-8 text-gold-500" />
            <h1 className="text-3xl md:text-4xl font-serif text-gold-500 tracking-tight">Settings</h1>
          </div>
          <p className="text-gray-500 text-sm">Gère ton profil, tes projets et tes préférences</p>
        </div>

        {/* TABS */}
        <div className="flex flex-wrap gap-2 border-b border-white/10 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab("identity")}
            className={`px-4 py-2 text-sm flex items-center gap-2 transition-colors whitespace-nowrap rounded-lg ${
              activeTab === "identity" 
                ? "bg-gold-500/20 text-gold-500" 
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <User className="w-4 h-4" /> Identity
          </button>
          <button
            onClick={() => setActiveTab("children")}
            className={`px-4 py-2 text-sm flex items-center gap-2 transition-colors whitespace-nowrap rounded-lg ${
              activeTab === "children" 
                ? "bg-gold-500/20 text-gold-500" 
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Users className="w-4 h-4" /> Children
          </button>
          <button
            onClick={() => setActiveTab("projects")}
            className={`px-4 py-2 text-sm flex items-center gap-2 transition-colors whitespace-nowrap rounded-lg ${
              activeTab === "projects" 
                ? "bg-gold-500/20 text-gold-500" 
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Briefcase className="w-4 h-4" /> Projects
          </button>
          <button
            onClick={() => setActiveTab("goals")}
            className={`px-4 py-2 text-sm flex items-center gap-2 transition-colors whitespace-nowrap rounded-lg ${
              activeTab === "goals" 
                ? "bg-gold-500/20 text-gold-500" 
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Target className="w-4 h-4" /> Goals
          </button>
          <button
            onClick={() => setActiveTab("notifications")}
            className={`px-4 py-2 text-sm flex items-center gap-2 transition-colors whitespace-nowrap rounded-lg ${
              activeTab === "notifications" 
                ? "bg-gold-500/20 text-gold-500" 
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Bell className="w-4 h-4" /> Notifications
          </button>
        </div>

        {/* IDENTITY TAB */}
        {activeTab === "identity" && (
          <div className="space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h2 className="text-lg font-serif text-ivory mb-4">Informations personnelles</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Prénom d'usage</label>
                  <input
                    type="text"
                    value={identityForm.preferred_name}
                    onChange={(e) => setIdentityForm({ ...identityForm, preferred_name: e.target.value })}
                    className="w-full bg-white/10 border border-white/10 rounded-lg px-4 py-2 text-ivory focus:outline-none focus:border-gold-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Nom complet</label>
                  <input
                    type="text"
                    value={identityForm.full_name}
                    onChange={(e) => setIdentityForm({ ...identityForm, full_name: e.target.value })}
                    className="w-full bg-white/10 border border-white/10 rounded-lg px-4 py-2 text-ivory focus:outline-none focus:border-gold-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Date de naissance</label>
                  <input
                    type="date"
                    value={identityForm.birthday}
                    onChange={(e) => setIdentityForm({ ...identityForm, birthday: e.target.value })}
                    className="w-full bg-white/10 border border-white/10 rounded-lg px-4 py-2 text-ivory focus:outline-none focus:border-gold-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Email</label>
                  <input
                    type="email"
                    value={identityForm.email}
                    onChange={(e) => setIdentityForm({ ...identityForm, email: e.target.value })}
                    className="w-full bg-white/10 border border-white/10 rounded-lg px-4 py-2 text-ivory focus:outline-none focus:border-gold-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Téléphone</label>
                  <input
                    type="tel"
                    value={identityForm.phone}
                    onChange={(e) => setIdentityForm({ ...identityForm, phone: e.target.value })}
                    className="w-full bg-white/10 border border-white/10 rounded-lg px-4 py-2 text-ivory focus:outline-none focus:border-gold-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Localisation</label>
                  <input
                    type="text"
                    value={identityForm.location}
                    onChange={(e) => setIdentityForm({ ...identityForm, location: e.target.value })}
                    className="w-full bg-white/10 border border-white/10 rounded-lg px-4 py-2 text-ivory focus:outline-none focus:border-gold-500"
                  />
                </div>
              </div>
              <button
                onClick={saveIdentity}
                disabled={isSaving}
                className="mt-6 w-full py-2 bg-gold-500 text-midnight rounded-lg font-medium hover:bg-gold-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Sauvegarder
              </button>
            </div>
          </div>
        )}

        {/* CHILDREN TAB */}
        {activeTab === "children" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-serif text-ivory">Mes enfants</h2>
              <button
                onClick={() => { setShowChildForm(true); setEditingChildIndex(null); setNewChild({ name: "", nickname: "", birthday: null, notes: "" }); }}
                className="text-sm bg-gold-500/20 text-gold-500 px-3 py-1.5 rounded-lg hover:bg-gold-500/30 transition-colors flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Ajouter
              </button>
            </div>
            
            <div className="space-y-3">
              {children.map((child, idx) => (
                <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <Baby className="w-5 h-5 text-pink-400" />
                      <div>
                        <p className="text-ivory font-medium">{child.name}</p>
                        {child.nickname && <p className="text-xs text-gray-500">Surnom: {child.nickname}</p>}
                        {child.birthday && <p className="text-xs text-gray-500">🎂 {new Date(child.birthday).toLocaleDateString('fr-FR')}</p>}
                        {child.notes && <p className="text-xs text-gray-400 mt-1">{child.notes}</p>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => editChild(idx)} className="text-gray-500 hover:text-gold-500">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteChild(idx)} className="text-gray-500 hover:text-red-400">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {children.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Baby className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Aucun enfant enregistré</p>
                </div>
              )}
            </div>

            <AnimatePresence>
              {showChildForm && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="bg-white/10 rounded-xl p-4 mt-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-gold-500 text-sm">{editingChildIndex !== null ? "Modifier" : "Ajouter"} un enfant</h3>
                    <button onClick={() => setShowChildForm(false)} className="text-gray-400 hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Nom complet *"
                      value={newChild.name}
                      onChange={(e) => setNewChild({ ...newChild, name: e.target.value })}
                      className="w-full bg-white/10 border border-white/10 rounded-lg px-4 py-2 text-ivory"
                    />
                    <input
                      type="text"
                      placeholder="Surnom (optionnel)"
                      value={newChild.nickname}
                      onChange={(e) => setNewChild({ ...newChild, nickname: e.target.value })}
                      className="w-full bg-white/10 border border-white/10 rounded-lg px-4 py-2 text-ivory"
                    />
                    <input
                      type="date"
                      placeholder="Date de naissance"
                      value={newChild.birthday || ""}
                      onChange={(e) => setNewChild({ ...newChild, birthday: e.target.value })}
                      className="w-full bg-white/10 border border-white/10 rounded-lg px-4 py-2 text-ivory"
                    />
                    <textarea
                      placeholder="Notes (allergies, école, etc.)"
                      value={newChild.notes}
                      onChange={(e) => setNewChild({ ...newChild, notes: e.target.value })}
                      className="w-full bg-white/10 border border-white/10 rounded-lg px-4 py-2 text-ivory"
                      rows={2}
                    />
                    <button onClick={addChild} className="w-full py-2 bg-gold-500 text-midnight rounded-lg text-sm font-medium">
                      {editingChildIndex !== null ? "Mettre à jour" : "Ajouter"}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* PROJECTS TAB */}
        {activeTab === "projects" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-serif text-ivory">Mes projets</h2>
              <button
                onClick={() => { setShowProjectForm(true); setEditingProjectIndex(null); setNewProject({ name: "", status: "active", priority: "normal", deadline: null, description: "" }); }}
                className="text-sm bg-gold-500/20 text-gold-500 px-3 py-1.5 rounded-lg hover:bg-gold-500/30 transition-colors flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Ajouter
              </button>
            </div>
            
            <div className="space-y-3">
              {projects.map((project, idx) => (
                <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {project.name === "Ifè Living Farm" && <Sprout className="w-4 h-4 text-green-400" />}
                        {project.name === "Love & Fire Sport" && <Trophy className="w-4 h-4 text-emerald-400" />}
                        {project.name === "Santé Plus Services" && <Heart className="w-4 h-4 text-red-400" />}
                        {project.name === "Bénin Relocation" && <Globe className="w-4 h-4 text-cyan-400" />}
                        <p className="text-ivory font-medium">{project.name}</p>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(project.status)}`}>
                          {project.status === "active" ? "Actif" : project.status === "planning" ? "Planification" : project.status === "paused" ? "En pause" : "Terminé"}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityColor(project.priority)}`}>
                          {project.priority === "critical" ? "Critique" : project.priority === "high" ? "Haute" : project.priority === "normal" ? "Normale" : "Basse"}
                        </span>
                      </div>
                      {project.deadline && <p className="text-xs text-gray-500 mt-2">📅 {new Date(project.deadline).toLocaleDateString('fr-FR')}</p>}
                      {project.description && <p className="text-xs text-gray-400 mt-2">{project.description}</p>}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => editProject(idx)} className="text-gray-500 hover:text-gold-500">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteProject(idx)} className="text-gray-500 hover:text-red-400">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {projects.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Briefcase className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Aucun projet enregistré</p>
                </div>
              )}
            </div>

            <AnimatePresence>
              {showProjectForm && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="bg-white/10 rounded-xl p-4 mt-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-gold-500 text-sm">{editingProjectIndex !== null ? "Modifier" : "Ajouter"} un projet</h3>
                    <button onClick={() => setShowProjectForm(false)} className="text-gray-400 hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-3">
                    <select
                      value={newProject.name}
                      onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                      className="w-full bg-white/10 border border-white/10 rounded-lg px-4 py-2 text-ivory"
                    >
                      <option value="">Sélectionner un projet</option>
                      {availableProjects.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <select
                      value={newProject.status}
                      onChange={(e) => setNewProject({ ...newProject, status: e.target.value })}
                      className="w-full bg-white/10 border border-white/10 rounded-lg px-4 py-2 text-ivory"
                    >
                      <option value="active">Actif</option>
                      <option value="planning">Planification</option>
                      <option value="paused">En pause</option>
                      <option value="complete">Terminé</option>
                    </select>
                    <select
                      value={newProject.priority}
                      onChange={(e) => setNewProject({ ...newProject, priority: e.target.value })}
                      className="w-full bg-white/10 border border-white/10 rounded-lg px-4 py-2 text-ivory"
                    >
                      <option value="critical">Critique</option>
                      <option value="high">Haute</option>
                      <option value="normal">Normale</option>
                      <option value="low">Basse</option>
                    </select>
                    <input
                      type="date"
                      placeholder="Date limite"
                      value={newProject.deadline || ""}
                      onChange={(e) => setNewProject({ ...newProject, deadline: e.target.value })}
                      className="w-full bg-white/10 border border-white/10 rounded-lg px-4 py-2 text-ivory"
                    />
                    <textarea
                      placeholder="Description"
                      value={newProject.description}
                      onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                      className="w-full bg-white/10 border border-white/10 rounded-lg px-4 py-2 text-ivory"
                      rows={2}
                    />
                    <button onClick={addProject} className="w-full py-2 bg-gold-500 text-midnight rounded-lg text-sm font-medium">
                      {editingProjectIndex !== null ? "Mettre à jour" : "Ajouter"}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* GOALS TAB */}
        {activeTab === "goals" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-serif text-ivory">Mes objectifs</h2>
              <button
                onClick={() => { setShowGoalForm(true); setEditingGoalIndex(null); setNewGoal({ goal: "", priority: "normal", deadline: null }); }}
                className="text-sm bg-gold-500/20 text-gold-500 px-3 py-1.5 rounded-lg hover:bg-gold-500/30 transition-colors flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Ajouter
              </button>
            </div>
            
            <div className="space-y-3">
              {goals.map((goal, idx) => (
                <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-ivory font-medium">{goal.goal}</p>
                      <div className="flex gap-2 mt-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityColor(goal.priority)}`}>
                          {goal.priority === "critical" ? "Critique" : goal.priority === "high" ? "Haute" : goal.priority === "normal" ? "Normale" : "Basse"}
                        </span>
                        {goal.deadline && <span className="text-xs text-gray-500">📅 {new Date(goal.deadline).toLocaleDateString('fr-FR')}</span>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => editGoal(idx)} className="text-gray-500 hover:text-gold-500">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteGoal(idx)} className="text-gray-500 hover:text-red-400">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {goals.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Target className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Aucun objectif enregistré</p>
                </div>
              )}
            </div>

            <AnimatePresence>
              {showGoalForm && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="bg-white/10 rounded-xl p-4 mt-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-gold-500 text-sm">{editingGoalIndex !== null ? "Modifier" : "Ajouter"} un objectif</h3>
                    <button onClick={() => setShowGoalForm(false)} className="text-gray-400 hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Objectif *"
                      value={newGoal.goal}
                      onChange={(e) => setNewGoal({ ...newGoal, goal: e.target.value })}
                      className="w-full bg-white/10 border border-white/10 rounded-lg px-4 py-2 text-ivory"
                    />
                    <select
                      value={newGoal.priority}
                      onChange={(e) => setNewGoal({ ...newGoal, priority: e.target.value })}
                      className="w-full bg-white/10 border border-white/10 rounded-lg px-4 py-2 text-ivory"
                    >
                      <option value="critical">Critique</option>
                      <option value="high">Haute</option>
                      <option value="normal">Normale</option>
                      <option value="low">Basse</option>
                    </select>
                    <input
                      type="date"
                      placeholder="Date limite"
                      value={newGoal.deadline || ""}
                      onChange={(e) => setNewGoal({ ...newGoal, deadline: e.target.value })}
                      className="w-full bg-white/10 border border-white/10 rounded-lg px-4 py-2 text-ivory"
                    />
                    <button onClick={addGoal} className="w-full py-2 bg-gold-500 text-midnight rounded-lg text-sm font-medium">
                      {editingGoalIndex !== null ? "Mettre à jour" : "Ajouter"}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* NOTIFICATIONS TAB */}
        {activeTab === "notifications" && (
          <div className="space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h2 className="text-lg font-serif text-ivory mb-4 flex items-center gap-2">
                <Bell className="w-5 h-5 text-gold-500" />
                Préférences de notification
              </h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <Volume2 className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-ivory text-sm">Son des notifications</p>
                      <p className="text-xs text-gray-500">Jouer un son quand une notification arrive</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setNotifPrefs(prev => ({ ...prev, sound: !prev.sound }))}
                    className={`w-12 h-6 rounded-full transition-colors ${notifPrefs.sound ? "bg-gold-500" : "bg-white/20"}`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white transition-transform ${notifPrefs.sound ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <Vibrate className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-ivory text-sm">Vibration</p>
                      <p className="text-xs text-gray-500">Vibrer quand une notification arrive</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setNotifPrefs(prev => ({ ...prev, vibration: !prev.vibration }))}
                    className={`w-12 h-6 rounded-full transition-colors ${notifPrefs.vibration ? "bg-gold-500" : "bg-white/20"}`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white transition-transform ${notifPrefs.vibration ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </div>

                <div className="border-t border-white/10 my-2" />

                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-ivory text-sm">Brief matinal</p>
                    <p className="text-xs text-gray-500">Recevoir un résumé le matin</p>
                  </div>
                  <button
                    onClick={() => setNotifPrefs(prev => ({ ...prev, morning_brief: !prev.morning_brief }))}
                    className={`w-12 h-6 rounded-full transition-colors ${notifPrefs.morning_brief ? "bg-gold-500" : "bg-white/20"}`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white transition-transform ${notifPrefs.morning_brief ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-ivory text-sm">Rappels de tâches</p>
                    <p className="text-xs text-gray-500">Être notifié des tâches à faire</p>
                  </div>
                  <button
                    onClick={() => setNotifPrefs(prev => ({ ...prev, task_reminders: !prev.task_reminders }))}
                    className={`w-12 h-6 rounded-full transition-colors ${notifPrefs.task_reminders ? "bg-gold-500" : "bg-white/20"}`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white transition-transform ${notifPrefs.task_reminders ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-ivory text-sm">Rappels de missions</p>
                    <p className="text-xs text-gray-500">Être notifié des missions inactives</p>
                  </div>
                  <button
                    onClick={() => setNotifPrefs(prev => ({ ...prev, mission_reminders: !prev.mission_reminders }))}
                    className={`w-12 h-6 rounded-full transition-colors ${notifPrefs.mission_reminders ? "bg-gold-500" : "bg-white/20"}`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white transition-transform ${notifPrefs.mission_reminders ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-ivory text-sm">Rappels de documents</p>
                    <p className="text-xs text-gray-500">Être notifié des documents en retard</p>
                  </div>
                  <button
                    onClick={() => setNotifPrefs(prev => ({ ...prev, document_reminders: !prev.document_reminders }))}
                    className={`w-12 h-6 rounded-full transition-colors ${notifPrefs.document_reminders ? "bg-gold-500" : "bg-white/20"}`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white transition-transform ${notifPrefs.document_reminders ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-ivory text-sm">Rappels de victoires</p>
                    <p className="text-xs text-gray-500">Être encouragé à célébrer ses victoires</p>
                  </div>
                  <button
                    onClick={() => setNotifPrefs(prev => ({ ...prev, celebration_reminders: !prev.celebration_reminders }))}
                    className={`w-12 h-6 rounded-full transition-colors ${notifPrefs.celebration_reminders ? "bg-gold-500" : "bg-white/20"}`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white transition-transform ${notifPrefs.celebration_reminders ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </div>
              </div>

              <button
                onClick={saveNotificationPreferences}
                className="mt-6 w-full py-2 bg-gold-500 text-midnight rounded-lg font-medium hover:bg-gold-400 transition-colors flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                Sauvegarder les préférences
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
