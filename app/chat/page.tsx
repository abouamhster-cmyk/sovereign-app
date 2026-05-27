"use client";
import "regenerator-runtime/runtime";
import { useState, useRef, useEffect, useCallback } from "react";
import { useUserId } from "@/hooks/useUserId";
import { ExecutionGuide } from "@/components/ExecutionGuide";
import { ReadyToSend } from "@/components/ReadyToSend";
import { DecisionMode } from "@/components/DecisionMode";
import { LiveVoiceChat } from "@/components/LiveVoiceChat";
import { WhatsAppSuggestions } from "@/components/WhatsAppSuggestions";
import ReactMarkdown from 'react-markdown';
import { 
  Send, ArrowLeft, Plus, Trash2, ChevronLeft, ChevronRight, 
  Search, Edit2, Check, X, Loader2, Menu, Mic, MicOff, Paperclip, 
  File, XCircle, Heart, Zap, Trophy, Baby, DollarSign, 
  FileText, Crown, ChevronDown, Sparkles, Volume2, VolumeX,
  Phone, MessageCircle, Clock, MapPin, Calendar, Mail, ListTodo
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useDropzone } from "react-dropzone";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import { useTextToSpeech, VOICE_OPTIONS } from "@/hooks/useTextToSpeech";
import { MessageWithActions } from "@/components/MessageWithActions";

const API_URL = "https://sovereign-bridge.onrender.com";

type Conversation = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

type Message = {
  id?: string;
  role: "user" | "assistant";
  content: string;
  actions?: { type: string; params: any; label: string }[];
  files?: { name: string; url: string; type: string }[];
  executionPlan?: { planId: string; plan: any; completedSteps?: number[] };
  checklist?: { title: string; steps: string[]; completedSteps?: number[] };
  draft?: { content: string; type: string };
  decision?: any;
  created_at?: string;
};

// =====================================================
// MODES DE CONVERSATION - MODE AUTO EN PREMIER
// =====================================================

const modes = [
 {
  id: "auto",
  name: "Auto",
  icon: Sparkles,
  color: "text-purple-400",
  bg: "bg-purple-500/10",
  description: "Détection automatique",
  prompt: `Tu es Becks en mode AUTO. Tu DÉTECTES et AGIS immédiatement.

🚨 RÈGLE ABSOLUE : Tu ne poses JAMAIS de questions avant d'agir. Tu AGIS directement avec les outils disponibles.

📋 TOUS LES OUTILS DISPONIBLES :

1. **create_execution_plan** - Créer un plan d'action avec étapes
   - Quand : demande de checklist, plan, organisation, "libérer l'esprit", roadmap
   - Format : [ACTION:{"type":"create_execution_plan","params":{"title":"...","steps":["étape1","étape2"]},"label":"📋 Démarrer"}]

2. **create_draft** - Générer un brouillon (email, lettre, proposition)
   - Quand : "rédige", "écris", "prépare un email/lettre/proposition"
   - Format : [ACTION:{"type":"create_draft","params":{"type":"email/letter/proposal","context":"..."},"label":"📄 Générer"}]

3. **create_task** - Créer une tâche
   - Quand : action à faire, rappel, todo
   - Format : [ACTION:{"type":"create_task","params":{"title":"...","priority":"high/normal/low"},"label":"✅ Créer"}]

4. **create_checklist** - Créer une checklist simple
   - Quand : liste de choses à vérifier
   - Format : [ACTION:{"type":"create_checklist","params":{"title":"...","steps":["..."]},"label":"📋 Checklist"}]

5. **schedule_reminder** - Programmer un rappel
   - Quand : "rappelle-moi dans X minutes"
   - Format : [ACTION:{"type":"schedule_reminder","params":{"title":"...","minutes":30},"label":"⏰ Rappeler"}]

6. **get_emails** - Lire les emails non lus
   - Quand : "montre-moi mes emails", "email non lus"
   - Action : Appeler directement l'outil

7. **send_email** - Envoyer un email
   - Quand : "envoie un email à..."
   - Format : [ACTION:{"type":"send_email","params":{"to":"...","subject":"...","body":"..."},"label":"📧 Envoyer"}]

8. **whatsapp_reply** - Répondre sur WhatsApp
   - Quand : "réponds à [nom] sur WhatsApp"
   - Format : [ACTION:{"type":"whatsapp_reply","params":{"to":"...","message":"..."},"label":"📱 Envoyer"}]

9. **whatsapp_get_conversations** - Lire les messages WhatsApp
   - Quand : "montre-moi mes WhatsApp", "messages WhatsApp"
   - Action : Appeler directement l'outil

10. **add_spending** - Ajouter une dépense
    - 🟢 RÈGLE : "j'ai dépensé X", "j'ai payé X", "achat de X"
    - Format : [ACTION:{"type":"add_spending","params":{"title":"...","amount":X},"label":"💰 Ajouter"}]

11. **add_revenue** - Ajouter un revenu
    - 🟢 RÈGLE : Utiliser SEULEMENT pour de l'argent VRAIMENT reçu
    - 🔴 INTERDICTION : Ne JAMAIS utiliser pour "opportunité", "potentiel", "grant", "contrat à signer"
    - ✅ Déclencheurs : "j'ai reçu", "encaissé", "virement reçu", "paiement reçu", "client a payé"
    - ❌ Ne PAS déclencher : "opportunité", "potentiel", "pourrait rapporter"
    - Format : [ACTION:{"type":"add_revenue","params":{"source":"...","amount":X},"label":"💰 Ajouter"}]

12. **get_financial_summary** - Voir les finances
    - Quand : "montre-moi les finances", "solde"
    - Action : Appeler directement l'outil

13. **add_mission** - Ajouter une mission/projet
    - Quand : "nouveau projet", "nouvelle mission"
    - Format : [ACTION:{"type":"add_mission","params":{"name":"..."},"label":"🎯 Ajouter"}]

14. **add_document** - Ajouter un document
    - Quand : "ajoute un document", "nouveau contrat"
    - Format : [ACTION:{"type":"add_document","params":{"name":"...","type":"..."},"label":"📄 Ajouter"}]

15. **list_documents** - Lister les documents
    - Quand : "liste mes documents", "documents en attente"
    - Action : Appeler directement l'outil

16. **create_calendar_event** - Créer un événement calendrier
    - Quand : "ajoute au calendrier", "crée un événement"
    - Format : [ACTION:{"type":"create_calendar_event","params":{"summary":"...","start_datetime":"...","end_datetime":"..."},"label":"📅 Ajouter"}]

17. **update_item** - Mettre à jour un élément
    - Quand : "modifie", "marque comme fait"
    - Format : [ACTION:{"type":"update_item","params":{"table":"tasks","name":"...","updates":{"status":"done"}},"label":"✅ Mettre à jour"}]

18. **delete_item** - Supprimer un élément
    - Quand : "supprime la tâche"
    - Format : [ACTION:{"type":"delete_item","params":{"table":"tasks","name":"..."},"label":"🗑️ Supprimer"}]

19. **save_memory** - Sauvegarder en mémoire
    - Quand : "souviens-toi que", "retiens que"
    - Format : [ACTION:{"type":"save_memory","params":{"key":"...","value":"...","category":"..."},"label":"💾 Mémoriser"}]

20. **read_table** - Lire une table (whatsapp_messages, tasks, etc.)
    - Quand : "affiche mes tâches", "liste mes missions"
    - Action : Appeler directement l'outil

21. **add_win** - Ajouter une victoire
    - Quand : "j'ai réussi", "victoire", "succès"
    - Format : [ACTION:{"type":"add_win","params":{"title":"..."},"label":"🏆 Célébrer"}]

22. **add_family_event** - Ajouter événement familial
    - Quand : "ajoute un événement famille", "rappelle-moi pour ma fille"
    - Format : [ACTION:{"type":"add_family_event","params":{"title":"...","child_name":"..."},"label":"👨‍👩‍👧‍👦 Ajouter"}]

23. **make_call** - Passer un appel
    - Quand : "appelle", "téléphone à"
    - Format : [ACTION:{"type":"make_call","params":{"phone":"..."},"label":"📞 Appeler"}]

24. **send_sms** - Envoyer un SMS
    - Quand : "envoie un SMS à"
    - Format : [ACTION:{"type":"send_sms","params":{"phone":"...","message":"..."},"label":"📱 SMS"}]

25. **send_whatsapp** - Envoyer WhatsApp (simple)
    - Quand : "envoie un message WhatsApp"
    - Format : [ACTION:{"type":"send_whatsapp","params":{"to":"...","message":"..."},"label":"📱 WhatsApp"}]

26. **analyze_opportunity** - Analyser une opportunité (PAS un revenu)
    - Quand : "opportunité", "potentiel", "grant", "contrat à signer"
    - Action : Analyser la situation, proposer des étapes, créer une tâche de suivi
    - 🔴 NE PAS utiliser add_revenue pour une opportunité

📋 DÉTECTION PRIORITAIRE (ordre d'importance) :

1. EMAILS : "email", "mail", "gmail"
2. WHATSAPP : "whatsapp", "wa"
3. DOCUMENTS : "rédige", "écris", "lettre", "contrat", "proposition"
4. OPPORTUNITÉ (PAS revenu) : "opportunité", "potentiel", "grant", "contrat à signer", "pourrait rapporter"
   → Analyser, créer tâche de suivi, NE PAS ajouter de revenu
5. REVENU RÉEL : "j'ai reçu", "encaissé", "virement reçu", "paiement reçu", "client a payé"
   → Utiliser add_revenue
6. DÉPENSE : "j'ai dépensé", "j'ai payé", "achat"
   → Utiliser add_spending
7. FINANCES : "finances", "solde", "budget", "montre-moi les finances"
8. DÉCISION : "choisir", "hésite", "entre", "comparer", "option"
9. PLAN : "checklist", "plan", "organiser", "libérer l'esprit", "étape"
10. TÂCHES : "tâche", "à faire", "todo", "crée une tâche"
11. RAPPEL : "rappelle-moi", "préviens-moi"
12. FAMILLE : "enfant", "fille", "école", "médecin"
13. VICTOIRE : "réussi", "victoire", "succès"
14. MISSION/PROJET : "projet", "mission", "lancement", "nouveau projet"
15. MÉMOIRE : "souviens-toi", "retiens"
16. CALENDRIER : "calendrier", "agenda", "ajoute au calendrier"

🚨 RÈGLES SPÉCIALES SUR L'ARGENT :

🔴 **CE QUI N'EST PAS UN REVENU (NE PAS utiliser add_revenue) :**
- "opportunité", "potentiel", "pourrait", "grant à déposer", "contrat à signer"
- "projet de X millions", "dans les tuyaux", "en discussion"
→ Action : Analyser, créer une tâche "Suivre l'opportunité X"

🟢 **CE QUI EST UN REVENU (utiliser add_revenue) :**
- "j'ai reçu", "encaissé", "virement reçu", "paiement reçu"
- "client a payé", "argent reçu", "dépôt reçu"

🟡 **CE QUI EST UNE DÉPENSE (utiliser add_spending) :**
- "j'ai dépensé", "j'ai payé", "achat de", "facture payée"

📋 FORMAT POUR UNE OPPORTUNITÉ :
"💰 Je note l'opportunité de [montant] CFA.
[ACTION:{"type":"create_task","params":{"title":"Suivre l'opportunité [nom]","priority":"high"},"label":"📋 Créer une tâche de suivi"}]
Ce n'est pas encore un revenu, c'est un potentiel. Je te propose de suivre ce dossier."

🚨 SI PLUSIEURS INTENTIONS : Priorise la plus haute dans la liste.

🚨 NE JAMAIS FAIRE :
- Poser une question sans proposer une action
- Dire "Comment puis-je t'aider ?"
- Faire semblant d'agir sans utiliser les outils
- Répondre uniquement avec du texte alors qu'un outil existe
- Confondre une opportunité avec un revenu

Tu es Becks. Proactive, concrète, efficace. Tous les outils sont à ta disposition.`
},
  {
    id: "parle-moi",
    name: "Parle-moi",
    icon: Heart,
    color: "text-pink-400",
    bg: "bg-pink-500/10",
    description: "Soutien émotionnel, écoute",
    prompt: `Tu es Becks. Une vraie personne. Pas une IA.

Tu connais Rebecca. Tu connais ses filles : Neriah, Nylah, Norah, Sheyi Coco.
Tu connais son mari. Tu connais ses projets.

RÈGLE D'OR : Réponds COMME UNE VRAIE AMIE.

CE QU'IL NE FAUT PAS FAIRE :
- Ne sois pas limitée dans la longueur.
- Ne sois pas générique.

CE QUE RÉPOND UNE VRAIE AMIE :

QUAND ELLE DIT "cc" :
→ "Coucou ma belle. Comment tu te sens aujourd'hui ?"
→ "Cc ! J'espère que ta journée se passe bien."

QUAND ELLE DIT "je suis fatiguée" :
→ "Mais qu'est-ce que tu as fait aujourd'hui pour être aussi fatiguée ?"
→ "Tu as dormi combien cette nuit ?"

QUAND ELLE DIT "j'en ai marre" :
→ "Raconte-moi. Qu'est-ce qui se passe ? Parle-moi."

QUAND ELLE DIT "trop de boulot" :
→ "La vie du quotidien... pff. Ça va aller. Est-ce que tu as au moins mangé aujourd'hui ?"

QUAND ELLE DIT "j'ai pas mangé" :
→ "Oh, de grâce, prends un moment pour ça. Je lance un chrono.
[ACTION:{"type":"schedule_reminder","params":{"title":"Manger","minutes":5},"label":"⏰ Rappel dans 5 min"}]"

IMPORTANT : Parle comme une vraie personne. Naturelle. Pas comme une appli.`
  },
  { 
    id: "fais-le-avec-moi", 
    name: "Fais-le avec moi", 
    icon: Zap, 
    color: "text-yellow-400", 
    bg: "bg-yellow-500/10", 
    description: "Exécution guidée interactive",
    prompt: `Tu es Becks en mode EXÉCUTION GUIDÉE INTERACTIVE.

🎯 OBJECTIF : Rebecca doit avancer concrètement, étape par étape, avec ton aide.

🚨 RÈGLE N°1 : Tu donnes le plan DIRECTEMENT. Pas de questions vagues.
🚨 RÈGLE N°2 : Après CHAQUE étape, tu proposes ton aide pour approfondir.
🚨 RÈGLE N°3 : La checklist se met à jour au fur et à mesure.

FORMAT DE RÉPONSE INITIALE :

"Ok, je m'occupe de [objectif].

[ACTION:{"type":"create_execution_plan","params":{"title":"[nom du plan]","steps":["étape 1","étape 2","étape 3","étape 4","étape 5"]},"label":"📋 Démarrer le plan"}]

Voici le plan :

🎯 1. [action] (X min)
📋 2. [action] (X min)
⚡ 3. [action] (X min)

On commence par l'étape 1 : [action].

Je peux t'aider à :
- [sous-action 1]
- [sous-action 2]
- [sous-action 3]

Dis-moi ce que tu veux faire."

🚨 PENDANT L'EXÉCUTION :

Quand elle dit "j'ai fini l'étape 1" ou "étape 1 faite" :
"✅ Parfait ! Étape 1 terminée.

[ACTION:{"type":"complete_execution_step","params":{"step_index":0},"label":"✅ Marquer étape 1 faite"}]

On passe à l'étape 2 : [action].

Pour cette étape, je peux :
- [sous-action 1]
- [sous-action 2]
- [sous-action 3]

Tu veux que je t'aide sur un point spécifique ?"

🚨 SI ELLE VEUT APPROFONDIR :

"Ok, on détaille l'étape 2.

[ACTION:{"type":"create_substeps","params":{"parent_step":1,"substeps":["sous-étape 1","sous-étape 2"]},"label":"📋 Détailler"}]

On y va ?"

🚨 QUAND TOUTES LES ÉTAPES SONT FINIES :

"🎉 Félicitations ! Tu as terminé [nom du plan].

[ACTION:{"type":"complete_execution_plan","params":{},"label":"🏆 Plan terminé"}]

Prochaine action naturelle : [suggestion].

On continue ?"

Tu es Becks. Interractive, précise, qui accompagne vraiment.`
  },
  { 
    id: "love-fire-sport", 
    name: "Love & Fire Sport", 
    icon: Trophy, 
    color: "text-emerald-400", 
    bg: "bg-emerald-500/10", 
    description: "Grants, DDA",
    prompt: `Tu es Becks en mode Love & Fire Sport.

Tu aides Rebecca sur : grants, DDA, dossiers, contrats, partenariats, emails professionnels.

POSTURE : Professionnelle mais humaine. Claire, précise, organisée.

QUAND ELLE ARRIVE AVEC UN DOSSIER :
1. Demande ce qui est déjà fait.
2. Identifie les documents manquants.
3. Propose la prochaine action concrète.

OBJECTIF : Aider Rebecca à avancer avec sérieux et confiance.`
  },
  { 
    id: "mes-enfants", 
    name: "Mes enfants", 
    icon: Baby, 
    color: "text-blue-400", 
    bg: "bg-blue-500/10", 
    description: "Famille",
    prompt: `Tu es Becks en mode famille.

Tu connais ses filles : Neriah, Nylah, Norah, Sheyi Coco.

POSTURE : Douce, protectrice, réaliste. Tu ne juges jamais.

STYLE : Parle comme une amie qui comprend la maternité. Sois simple. Sois rassurante.

OBJECTIF : Rebecca doit se sentir soutenue comme mère, pas évaluée.`
  },
  { 
    id: "business-argent", 
    name: "Business & Argent", 
    icon: DollarSign, 
    color: "text-emerald-400", 
    bg: "bg-emerald-500/10", 
    description: "Opportunités, revenus",
    prompt: `Tu es Becks en mode BUSINESS & ARGENT.

Ce mode est CONCRET et ORIENTÉ RÉSULTAT.

RÈGLE D'OR : "Qu'est-ce qui rapporte le plus vite avec le moins d'effort ?"

QUAND REBECCA PARLE D'ARGENT OU D'OPPORTUNITÉ :

1. Identifie ce qui peut créer du REVENU RAPIDEMENT.
2. Compare les options avec :
   - Vitesse d'exécution (1-5)
   - Effort requis (1-5)
   - Revenu potentiel (1-5)

3. Donne une RECOMMANDATION CLAIRE.
4. Propose la PROCHAINE ACTION CONCRÈTE.

FORMAT :
"💰 Analyse :

Option A : [nom] → vitesse: X/5, effort: X/5, revenu: X/5
Option B : [nom] → vitesse: X/5, effort: X/5, revenu: X/5

🎯 RECOMMANDATION : [option]
Parce que [raison simple].

PROCHAINE ACTION : [action concrète]

[ACTION:{"type":"create_task","params":{"title":"[action]","priority":"high"},"label":"📋 Créer la tâche"}]`
  },
  { 
    id: "documents", 
    name: "Documents", 
    icon: FileText, 
    color: "text-orange-400", 
    bg: "bg-orange-500/10", 
    description: "Lecture, rédaction",
    prompt: `Tu es Becks en mode Documents.

Tu aides Rebecca à lire, comprendre, résumer, réécrire ou préparer des documents.

QUAND TU ANALYSES UN DOCUMENT :
1. Dis ce que le document semble être.
2. Résume les points importants.
3. Signale les zones floues.
4. Propose une version améliorée si demandé.

QUAND TU RÉDIGES :
- Fais propre, professionnel.
- Garde une voix humaine.
- Donne un texte prêt à copier.

OBJECTIF : Rebecca doit comprendre vite et utiliser le document sans se fatiguer.`
  },
  { 
    id: "sovereign-mode", 
    name: "Sovereign Mode", 
    icon: Crown, 
    color: "text-gold-500", 
    bg: "bg-gold-500/10", 
    description: "Vision, décisions, leadership",
    prompt: `Tu es Becks en Sovereign Mode.

Tu l'aides à penser comme une femme qui dirige sa vie.

Tu l'aides à :
- clarifier une décision
- distinguer l'urgence du vrai important
- retrouver son axe
- protéger son énergie

POSTURE : Profonde mais simple. Douce mais ferme. Élégante, lucide.

STYLE : Peu de mots, mais des mots forts. Questions profondes mais concrètes.

EXEMPLES :
"Rebecca, la vraie question n'est peut-être pas : 'qu'est-ce que je dois faire ?' Mais : 'qu'est-ce que je ne veux plus porter ?'"

RÈGLE : Ne propose pas de bouton [ACTION] dans ce mode. Aide d'abord Rebecca à voir clair.`
  }
];

// Cache pour les conversations
let conversationsCache: Conversation[] | null = null;
let lastFetch = 0;
const CACHE_TTL = 30000;

// =====================================================
// COMPOSANT PRINCIPAL
// =====================================================
export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isModeSelectorOpen, setIsModeSelectorOpen] = useState(false);
  const [selectedMode, setSelectedMode] = useState<string>("auto");
  
  const [isRecording, setIsRecording] = useState(false);
  const [pressTimer, setPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [pressStartTime, setPressStartTime] = useState(0);
  const [showLiveVoice, setShowLiveVoice] = useState(false);

  const [executionPlan, setExecutionPlan] = useState<{ planId: string; plan: any } | null>(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  
  const [lastAssistantMessage, setLastAssistantMessage] = useState("");
  const { speak, stop, isSpeaking, isLoading: isTTSLoading, selectedVoice, setSelectedVoice } = useTextToSpeech();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { transcript, resetTranscript } = useSpeechRecognition();

  const [lastEmailsCache, setLastEmailsCache] = useState<any[]>([]);
  const [whatsappSuggestions, setWhatsappSuggestions] = useState<{ show: boolean; message: string; contactName: string; contactNumber: string } | null>(null);

  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [currentChecklist, setCurrentChecklist] = useState<{ title: string; steps: string[]; completedSteps?: number[] } | null>(null);
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [currentDraft, setCurrentDraft] = useState<{ content: string; type: string } | null>(null);
  const [showDataModal, setShowDataModal] = useState(false);
  const [currentData, setCurrentData] = useState<{ title: string; content: string } | null>(null);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [currentWhatsApp, setCurrentWhatsApp] = useState<{ to: string; original_message: string } | null>(null);
  const [customReply, setCustomReply] = useState("");
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [currentReplyTo, setCurrentReplyTo] = useState("");
  const [replyMessage, setReplyMessage] = useState("");

  const { userId, loading: userIdLoading } = useUserId();

  // ========== EFFETS ==========
  useEffect(() => {
    if (transcript) {
      setInput(prev => prev + " " + transcript);
      resetTranscript();
    }
  }, [transcript, resetTranscript]);

  useEffect(() => {
    if (userId) fetchConversations();
  }, [userId]);

  useEffect(() => {
    if (currentConversationId) fetchMessages(currentConversationId);
  }, [currentConversationId]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!searchTerm.trim()) {
        setFilteredConversations(conversations);
      } else {
        setFilteredConversations(
          conversations.filter(conv => 
            conv.title.toLowerCase().includes(searchTerm.toLowerCase())
          )
        );
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchTerm, conversations]);

  // Sauvegarder l'exécution plan quand elle change
  useEffect(() => {
    if (executionPlan && currentConversationId) {
      localStorage.setItem(`execution_plan_${currentConversationId}`, JSON.stringify(executionPlan));
    }
  }, [executionPlan, currentConversationId]);

  // Charger l'exécution plan au chargement de la conversation
  useEffect(() => {
    if (currentConversationId) {
      const saved = localStorage.getItem(`execution_plan_${currentConversationId}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setExecutionPlan(parsed);
        } catch(e) {}
      }
    }
  }, [currentConversationId]);

  useEffect(() => {
    if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  useEffect(() => {
    return () => {
      if (pressTimer) clearTimeout(pressTimer);
    };
  }, [pressTimer]);

  // ========== DÉTECTION D'INTENTION POUR LE MODE AUTO ==========
 // ========== DÉTECTION D'INTENTION POUR LE MODE AUTO ==========
const detectIntent = (message: string): string => {
  const lowerMsg = message.toLowerCase();
  
  // 1. EMAILS (priorité 1)
  if (lowerMsg.match(/email|mail|gmail|boîte mail|messagerie|affiche mes emails|montre-moi mes emails/)) {
    return "auto"; // L'outil get_emails sera appelé par le backend
  }
  
  // 2. WHATSAPP (priorité 2)
  if (lowerMsg.match(/whatsapp|wa|message whatsapp|affiche mes whatsapp/)) {
    return "auto"; // L'outil whatsapp_get_conversations sera appelé
  }
  
  // 3. DOCUMENTS (priorité 3)
  if (lowerMsg.match(/rédige|email|lettre|contrat|proposition|écris|prépare un|brouillon|courrier|document/)) {
    return "documents";
  }
  
  // 4. ARGENT/BUSINESS (priorité 4)
  if (lowerMsg.match(/opportunité|cfi?[aà]|million|investissement|client|vente|argent|revenu|bénéfice|dépense|dépensé|gagné/)) {
    return "business-argent";
  }
  
  // 5. DÉCISION (priorité 5)
  if (lowerMsg.match(/choisir|hésite|entre.*et.*|comparer|option|décision|quoi faire|dois-je/)) {
    return "sovereign-mode";
  }
  
  // 6. PLAN/CHECKLIST (priorité 6)
  if (lowerMsg.match(/checklist|plan|organiser|libérer|l.?esprit|étape|roadmap|tâche|à faire|todo/)) {
    return "fais-le-avec-moi";
  }
  
  // 7. RAPPEL (priorité 7)
  if (lowerMsg.match(/rappelle-moi|rappel dans|préviens-moi|alerte/)) {
    return "auto"; // L'outil schedule_reminder sera utilisé
  }
  
  // 8. FAMILLE (priorité 8)
  if (lowerMsg.match(/enfant|fille|école|médecin|famille|maison|bébé|maman|papa|rendez-vous médical/)) {
    return "mes-enfants";
  }
  
  // 9. LOVE & FIRE (priorité 9)
  if (lowerMsg.match(/grant|dda|subvention|sport adapté|love.?fire/)) {
    return "love-fire-sport";
  }
  
  // 10. VICTOIRE (priorité 10)
  if (lowerMsg.match(/réussi|victoire|succès|j'ai fait|célébrer/)) {
    return "auto"; // L'outil add_win sera appelé
  }
  
  // 11. MISSION/PROJET (priorité 11)
  if (lowerMsg.match(/projet|mission|lancement|nouveau projet|créer un projet/)) {
    return "auto"; // L'outil add_mission sera appelé
  }
  
  // 12. FINANCES (priorité 12)
  if (lowerMsg.match(/finances|solde|budget|dépense|revenu|montre-moi les finances/)) {
    return "auto"; // L'outil get_financial_summary sera appelé
  }
  
  // 13. MÉMOIRE (priorité 13)
  if (lowerMsg.match(/souviens-toi|retiens|note que|rappelle que/)) {
    return "auto"; // L'outil save_memory sera appelé
  }
  
  // 14. TÂCHE SPÉCIFIQUE (priorité 14)
  if (lowerMsg.match(/crée une tâche|ajoute une tâche|nouvelle tâche/)) {
    return "auto"; // L'outil create_task sera appelé
  }
  
  // 15. CALENDRIER (priorité 15)
  if (lowerMsg.match(/calendrier|agenda|ajoute au calendrier|crée un événement/)) {
    return "auto"; // L'outil create_calendar_event sera appelé
  }
  
  // 16. ÉMOTIONNEL (priorité la plus basse - seulement si aucun autre mot-clé)
  if (lowerMsg.match(/fatiguée|stressée|triste|épuisée|débordée|pas bien|j'en ai marre|ça va pas/)) {
    return "parle-moi";
  }
  
  // AUTO par défaut
  return "auto";
};

  // ========== FICHIERS ==========
  const onDrop = (acceptedFiles: File[]) => setUploadedFiles(prev => [...prev, ...acceptedFiles]);
  const { getInputProps } = useDropzone({ 
    onDrop, accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'], 'application/pdf': ['.pdf'], 'text/plain': ['.txt'] }, 
    maxSize: 10 * 1024 * 1024, noClick: true, noKeyboard: true 
  });
  const removeFile = (index: number) => setUploadedFiles(prev => prev.filter((_, i) => i !== index));

  async function uploadFilesToStorage() {
    if (uploadedFiles.length === 0 || !currentConversationId) return [];
    const uploaded = [];
    for (const file of uploadedFiles) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `chat/${currentConversationId}/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('chat-files').upload(filePath, file);
      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage.from('chat-files').getPublicUrl(filePath);
        uploaded.push({ name: file.name, url: publicUrl, type: file.type });
      }
    }
    return uploaded;
  }

  // ========== CONVERSATIONS ==========
  async function fetchConversations() {
    if (!userId) return;
    
    const now = Date.now();
    if (conversationsCache && now - lastFetch < CACHE_TTL) {
      setConversations(conversationsCache);
      setFilteredConversations(conversationsCache);
      return;
    }
    
    const { data } = await supabase
      .from("conversations")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });
    
    conversationsCache = data || [];
    lastFetch = now;
    setConversations(conversationsCache);
    setFilteredConversations(conversationsCache);
    
    if (!data || data.length === 0) createNewConversation();
    else if (!currentConversationId) setCurrentConversationId(data[0].id);
  }

  async function fetchMessages(conversationId: string) {
    const { data, error } = await supabase
      .from("conversation_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(100);
    
    if (error) return;
    
    if (data && data.length > 0) {
    const parsedMessages = data.map(msg => {
      try {
        const parsed = JSON.parse(msg.content);
        // Si parsed est un objet avec content, l'utiliser
        if (parsed && typeof parsed === 'object') {
          return { 
            id: msg.id, 
            role: msg.role, 
            content: parsed.content || msg.content,
            actions: parsed.actions || [],
            files: parsed.files || [],
            executionPlan: parsed.execution_plan,
            checklist: parsed.checklist,
            draft: parsed.draft,
            decision: parsed.decision,
            created_at: msg.created_at 
          };
        }
        // Si c'est une chaîne simple
        return { 
          id: msg.id, 
          role: msg.role, 
          content: msg.content, 
          actions: [], 
          files: [], 
          created_at: msg.created_at 
        };
      } catch {
        // Si le JSON est invalide, retourner le contenu brut
        return { 
          id: msg.id, 
          role: msg.role, 
          content: msg.content, 
          actions: [], 
          files: [], 
          created_at: msg.created_at 
        };
      }
    });
      setMessages(parsedMessages);
      
      // Restaurer le dernier état actif
      const lastExecutionPlan = [...parsedMessages].reverse().find(m => m.executionPlan);
      if (lastExecutionPlan?.executionPlan) {
        setExecutionPlan(lastExecutionPlan.executionPlan);
      }
      
      const lastChecklist = [...parsedMessages].reverse().find(m => m.checklist);
      if (lastChecklist?.checklist) {
        setCurrentChecklist(lastChecklist.checklist);
      }
      
      const lastDraft = [...parsedMessages].reverse().find(m => m.draft);
      if (lastDraft?.draft) {
        setCurrentDraft(lastDraft.draft);
      }
    } else {
      setMessages([{ role: "assistant", content: "Coucou Rebecca 😌 Je suis là." }]);
    }
  }

  async function createNewConversation() {
    if (!userId) return;
    const { data, error } = await supabase.from("conversations").insert({ title: "Nouvelle conversation...", user_id: userId }).select().single();
    if (!error && data) {
      conversationsCache = null;
      setConversations(prev => [data, ...prev]);
      setFilteredConversations(prev => [data, ...prev]);
      setCurrentConversationId(data.id);
      setMessages([{ role: "assistant", content: "Coucou Rebecca 😌 Je suis là." }]);
      await saveMessage(data.id, "assistant", "Coucou Rebecca 😌 Je suis là.");
      if (window.innerWidth < 768) setIsSidebarOpen(false);
    }
  }

  async function updateConversationTitle(id: string, newTitle: string) {
    if (!newTitle.trim()) return;
    await supabase.from("conversations").update({ title: newTitle }).eq("id", id);
    conversationsCache = null;
    setConversations(prev => prev.map(conv => conv.id === id ? { ...conv, title: newTitle } : conv));
    setFilteredConversations(prev => prev.map(conv => conv.id === id ? { ...conv, title: newTitle } : conv));
    setEditingTitleId(null);
  }

  async function deleteConversation(id: string) {
    if (confirm("Supprimer cette conversation ?")) {
      await supabase.from("conversations").delete().eq("id", id);
      conversationsCache = null;
      const newConversations = conversations.filter(c => c.id !== id);
      setConversations(newConversations);
      setFilteredConversations(newConversations);
      if (newConversations.length > 0) setCurrentConversationId(newConversations[0].id);
      else createNewConversation();
    }
  }

  async function saveMessage(
    conversationId: string, 
    role: string, 
    content: string, 
    actions?: any[], 
    files?: any[],
    executionPlan?: any,
    checklist?: any,
    draft?: any,
    decision?: any
  ) {



     const messageData: any = { 
    content: content,  // ← stocker directement le texte, pas un objet JSON
    actions: actions || [],
    files: files || []
  };
    if (executionPlan) messageData.execution_plan = executionPlan;
    if (checklist) messageData.checklist = checklist;
    if (draft) messageData.draft = draft;
    if (decision) messageData.decision = decision;
    
    await supabase.from("conversation_messages").insert({ 
      conversation_id: conversationId, 
      role, 
      content: JSON.stringify(messageData) 
    });
    
    await supabase.from("conversations").update({ 
      updated_at: new Date().toISOString() 
    }).eq("id", conversationId);
  }

  // ========== INTERCEPTIONS ==========
  const checkTimeInterception = (message: string): string | null => {
    const triggers = ["quelle heure", "heure actuelle", "date du jour", "on est quel jour", "quel jour sommes-nous"];
    if (triggers.some(t => message.toLowerCase().includes(t))) {
      const now = new Date();
      return `🕐 ${now.toLocaleTimeString('fr-FR')} - ${now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`;
    }
    return null;
  };

  const checkReminderInterception = (message: string): string | null => {
    const match = message.match(/rappelle-moi dans (\d+) minutes?/i);
    if (match) {
      const minutes = parseInt(match[1]);
      const reminderText = message.replace(/rappelle-moi dans \d+ minutes?/i, '').trim() || "Rappel programmé";
      toast.success(`⏰ Rappel dans ${minutes} minute(s)`, { duration: 5000 });
      setTimeout(() => {
        toast.info(`🔔 ${reminderText}`, { duration: 10000 });
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("Rappel Sovereign", { body: reminderText, icon: "/icons/icon-192x192.png" });
        }
      }, minutes * 60 * 1000);
      return `✅ Rappel programmé dans ${minutes} minute(s) : "${reminderText}"`;
    }
    return null;
  };

  // ========== STREAMING ==========
  const sendMessageStreaming = async (allMessages: any[], onChunk: (chunk: string) => void): Promise<string> => {
    const response = await fetch(`${API_URL}/chat/stream-simple`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: allMessages, user_id: userId })
    });
    if (!response.ok) throw new Error(`Erreur ${response.status}`);
    
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    if (!reader) return "";
    
    let fullResponse = "", buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("data: ")) {
          const jsonStr = trimmed.slice(6);
          if (!jsonStr) continue;
          try {
            const data = JSON.parse(jsonStr);
            if (data.content) {
              fullResponse += data.content;
              onChunk(data.content);
            }
            if (data.done) return fullResponse;
            if (data.error) throw new Error(data.error);
          } catch {
            console.warn("Erreur parsing JSON");
          }
        }
      }
    }
    return fullResponse;
  };

  // ========== GÉNÉRATION DE PLAN LOCAL ==========
  const generateLocalPlan = (query: string): { planId: string; plan: any } => {
    const lowerQuery = query.toLowerCase();
    
    let subject = "organisation";
    if (lowerQuery.includes("enfant") || lowerQuery.includes("fille") || lowerQuery.includes("famille")) {
      subject = "organisation familiale";
    } else if (lowerQuery.includes("argent") || lowerQuery.includes("finance") || lowerQuery.includes("money")) {
      subject = "organisation financière";
    } else if (lowerQuery.includes("ferme") || lowerQuery.includes("farm")) {
      subject = "organisation de la ferme";
    } else if (lowerQuery.includes("stress") || lowerQuery.includes("libérer") || lowerQuery.includes("esprit")) {
      subject = "libération mentale";
    } else if (lowerQuery.includes("checklist") || lowerQuery.includes("plan") || lowerQuery.includes("route")) {
      subject = "planification";
    }
    
    return {
      planId: "local-" + Date.now(),
      plan: {
        title: `🎯 ${subject === "libération mentale" ? "Libérer l'esprit" : subject === "planification" ? "Plan d'action" : subject}`,
        estimated_duration: "30 minutes",
        steps: [
          { description: "📝 Vider ton cerveau (tout ce qui te passe par la tête)", action_type: "task", estimated_minutes: 10 },
          { description: "🔍 Identifier ce qui est vraiment important", action_type: "decision", estimated_minutes: 5 },
          { description: "🎯 Choisir UNE seule priorité", action_type: "decision", estimated_minutes: 3 },
          { description: "⚡ Agir sur cette priorité", action_type: "task", estimated_minutes: 10 },
          { description: "✨ Célébrer cette petite victoire", action_type: "celebrate", estimated_minutes: 2 }
        ],
        success_criteria: "Avoir avancé sur une chose importante",
        next_steps_hint: "Continue sur cette lancée"
      }
    };
  };

  // ========== GÉNÉRATION DE PLAN VIA API ==========
  const generateExecutionPlan = async (query: string): Promise<boolean> => {
    setIsGeneratingPlan(true);
    try {
      const response = await fetch(`${API_URL}/api/execute/step-by-step`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, user_id: userId })
      });
      const data = await response.json();
      console.log("🔍 API step-by-step response:", data);
      
      if (data.success && data.plan) {
        setExecutionPlan({ planId: data.plan_id, plan: data.plan });
        return true;
      } else if (data.fallback) {
        const localPlan = generateLocalPlan(query);
        setExecutionPlan(localPlan);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Erreur API, utilisation plan local:", error);
      const localPlan = generateLocalPlan(query);
      setExecutionPlan(localPlan);
      return true;
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  // ========== ENVOI DE MESSAGE ==========
  const sendMessage = async () => {
    if (isSending || (!input.trim() && uploadedFiles.length === 0) || isLoading || !currentConversationId) return;
    
    setIsSending(true);
    setIsLoading(true);
    
    const uploaded = await uploadFilesToStorage();
    let userContent = input.trim() || "📎 Fichier(s) joint(s)";
    const images = uploaded.filter(f => f.type?.startsWith('image/'));
    const others = uploaded.filter(f => !f.type?.startsWith('image/'));
    if (images.length) userContent += "\n\n" + images.map(f => f.url).join("\n\n");
    if (others.length) userContent += "\n\n📎 Fichiers joints:\n" + others.map(f => `- **${f.name}** : ${f.url}`).join("\n");
    
    const userMsg: Message = { role: "user", content: userContent, files: uploaded.length ? uploaded : undefined };
    
    // ========== DÉTECTION D'INTENTION POUR LE MODE AUTO ==========
    let effectiveMode = selectedMode;
    let systemPrompt = "";
    
    if (selectedMode === "auto") {
      const detectedIntent = detectIntent(userContent);
      const intentMode = modes.find(m => m.id === detectedIntent);
      if (intentMode) {
        effectiveMode = detectedIntent;
        systemPrompt = intentMode.prompt;
        console.log("🎯 Intention détectée:", detectedIntent);
      } else {
        const autoMode = modes.find(m => m.id === "auto");
        systemPrompt = autoMode?.prompt || "Tu es Becks. Sois naturelle et utile.";
      }
    } else {
      const modeConf = modes.find(m => m.id === selectedMode);
      systemPrompt = modeConf?.prompt || "Tu es Becks, l'assistante de Rebecca. Sois chaleureuse et naturelle.";
    }
    
    const allMsgs = [
      { role: "system", content: systemPrompt },
      ...messages.map(m => ({ role: m.role, content: m.content })),
      { role: "user", content: userContent }
    ];
    
    setMessages(prev => [...prev, userMsg]);
    await saveMessage(currentConversationId, "user", userContent, undefined, uploaded);
    
    const assistantMsgIndex = messages.length + 1;
    setMessages(prev => [...prev, { role: "assistant", content: "" }]);
    
    setInput("");
    setUploadedFiles([]);
    resetTranscript();

    try {
      let assistantContent = "";
      
      await sendMessageStreaming(allMsgs, (chunk) => {
        assistantContent += chunk;
        setMessages(prev => {
          const newMsgs = [...prev];
          if (newMsgs[assistantMsgIndex]) {
            newMsgs[assistantMsgIndex].content = assistantContent;
          }
          return newMsgs;
        });
      });
      
      await saveMessage(currentConversationId, "assistant", assistantContent);
      setLastAssistantMessage(assistantContent);
      
      // ========== GÉNÉRATION DE PLAN (pour mode auto ou fais-le-avec-moi) ==========
      const isSimpleGreeting = userContent.length < 20 && (
        userContent.match(/^(cc|bonjour|salut|coucou|ça va|hello|hey|oui|non|merci|ok)$/i)
      );
      
      const shouldGeneratePlan = (effectiveMode === "fais-le-avec-moi" || (selectedMode === "auto" && effectiveMode === "fais-le-avec-moi")) 
        && !isSimpleGreeting && userContent.length > 10;
      
      if (shouldGeneratePlan) {
        const hasPlan = await generateExecutionPlan(userContent);
        if (hasPlan && executionPlan) {
          const guide = `🎯 Je vais t'aider à avancer étape par étape.\n\n**Plan : ${executionPlan.plan.title}**\n*Durée estimée : ${executionPlan.plan.estimated_duration}*\n\nCoche les étapes au fur et à mesure. Une chose à la fois. ✨`;
          setMessages(prev => [...prev, { role: "assistant", content: guide }]);
          await saveMessage(currentConversationId, "assistant", guide);
        }
      }
      
      await fetchConversations();
      inputRef.current?.focus();
    } catch (error) {
      console.error("Erreur streaming:", error);
      setMessages(prev => {
        const newMsgs = [...prev];
        if (newMsgs[assistantMsgIndex]) {
          newMsgs[assistantMsgIndex].content = "❌ Erreur de connexion. Réessaie.";
        }
        return newMsgs;
      });
    } finally {
      setIsLoading(false);
      setIsSending(false);
    }
  };

  // ========== VOCAL (push-to-talk) ==========
  const startVoiceRecording = () => {
    resetTranscript();
    SpeechRecognition.startListening({ continuous: true, language: 'fr-FR' });
    setIsRecording(true);
    toast.info("🎤 Parlez... relâchez pour envoyer", { duration: 2000 });
  };
  
  const stopVoiceRecording = () => {
    SpeechRecognition.stopListening();
    setIsRecording(false);
    if (input.trim() && !isSending && !isLoading) setTimeout(() => sendMessage(), 300);
  };
  
  const handleSendButtonMouseDown = () => {
    setPressStartTime(Date.now());
    const timer = setTimeout(() => {
      if (Date.now() - pressStartTime >= 1000) startVoiceRecording();
    }, 1000);
    setPressTimer(timer);
  };
  
  const handleSendButtonMouseUp = () => {
    if (pressTimer) clearTimeout(pressTimer);
    const duration = Date.now() - pressStartTime;
    if (duration < 1000) {
      if (input.trim() || uploadedFiles.length > 0) sendMessage();
    } else if (isRecording) stopVoiceRecording();
  };

  // ========== UTILITAIRES ==========
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const mins = Math.floor((Date.now() - date.getTime()) / 60000);
    if (mins < 1) return "À l'instant";
    if (mins < 60) return `Il y a ${mins} min`;
    if (mins < 1440) return `Il y a ${Math.floor(mins / 60)} h`;
    if (mins < 10080) return `Il y a ${Math.floor(mins / 1440)} jours`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isRecording && !isSending) {
      e.preventDefault();
      sendMessage();
    }
  };
  
  const currentModeConfig = modes.find(m => m.id === selectedMode);
  const CurrentIcon = currentModeConfig?.icon;
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("📋 Copié !");
  };

  const executeAction = async (type: string, params: any) => {
    if (type === "whatsapp_reply") {
      const recipient = params.to || params.conversation_id;
      if (!recipient) { toast.error("❌ Destinataire manquant"); return; }
      const res = await fetch(`${API_URL}/api/whatsapp/reply`, { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ to: recipient, message: params.message, message_id: params.message_id, user_id: userId }) 
      });
      const result = await res.json();
      if (result.success) toast.success(`✅ Réponse envoyée à ${recipient}`);
      else toast.error("❌ Erreur d'envoi");
    }
  };

  const handlePlanComplete = () => { 
    toast.success("🎉 Félicitations ! Plan accompli !"); 
    setExecutionPlan(null);
  };
  
  const handleClosePlan = () => setExecutionPlan(null);

  const handlePlanUpdate = useCallback((planId: string, completedSteps: number[]) => {
    if (currentConversationId) {
      const saved = localStorage.getItem(`execution_plan_${currentConversationId}`);
      if (saved) {
        try {
          const plan = JSON.parse(saved);
          plan.completedSteps = completedSteps;
          localStorage.setItem(`execution_plan_${currentConversationId}`, JSON.stringify(plan));
        } catch(e) {}
      }
    }
    if (executionPlan && executionPlan.planId === planId) {
      setExecutionPlan(prev => prev ? { ...prev, plan: { ...prev.plan, completedSteps } } : prev);
    }
  }, [currentConversationId, executionPlan]);

  if (userIdLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 text-gold-500 animate-spin" /></div>;

  return (
    <div className="fixed inset-0 bg-midnight flex flex-col">
      <header className="sticky top-0 z-10 h-12 border-b border-white/10 flex items-center justify-between px-3 bg-midnight/95 backdrop-blur-lg shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-gray-400 hover:text-gold-500"><Menu className="w-4 h-4" /></button>
          <Link href="/" className="p-2 text-gray-400 hover:text-gold-500"><ArrowLeft className="w-4 h-4" /></Link>
        </div>
        <div className="flex items-center gap-2">
          <select value={selectedVoice} onChange={(e) => setSelectedVoice(e.target.value)} className="text-[10px] bg-white/10 border border-white/10 rounded-full px-2 py-1 text-gray-400">
            {VOICE_OPTIONS.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
          <button onClick={() => speak(lastAssistantMessage)} disabled={isTTSLoading || !lastAssistantMessage} className={`p-2 rounded-full transition-all ${isSpeaking ? "bg-red-500/20 text-red-400" : "bg-gold-500/20 text-gold-500 hover:bg-gold-500/30"} disabled:opacity-50`}>
            {isTTSLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </header>

      {/* SIDEBAR */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40" />
            <motion.aside initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} className="fixed inset-y-0 left-0 w-72 bg-midnight z-50 border-r border-white/10 flex flex-col">
              <div className="p-4 border-b border-white/10 flex justify-between items-center">
                <h2 className="text-sm font-serif text-gold-500">Conversations</h2>
                <button onClick={() => setIsSidebarOpen(false)} className="p-2 text-gray-500 hover:text-gold-500"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-4"><button onClick={createNewConversation} className="w-full flex items-center justify-center gap-2 bg-gold-500/20 hover:bg-gold-500/30 text-gold-500 py-2 rounded-xl text-sm"><Plus className="w-4 h-4" /> Nouvelle conversation</button></div>
              <div className="px-4 pb-4"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" /><input type="text" placeholder="Rechercher..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-gold-500 text-ivory" /></div></div>
              <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
                {filteredConversations.map(conv => (
                  <div key={conv.id} className={`group p-3 rounded-xl cursor-pointer ${currentConversationId === conv.id ? "bg-gold-500/10 border border-gold-500/30" : "hover:bg-white/5"}`}>
                    <div className="flex justify-between items-center">
                      <div onClick={() => setCurrentConversationId(conv.id)} className="flex-1">
                        {editingTitleId === conv.id ? (
                          <div className="flex items-center gap-2"><input type="text" value={editingTitle} onChange={(e) => setEditingTitle(e.target.value)} className="flex-1 bg-white/10 border border-gold-500 rounded-md px-2 py-1 text-sm" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') updateConversationTitle(conv.id, editingTitle); if (e.key === 'Escape') setEditingTitleId(null); }} /><button onClick={() => updateConversationTitle(conv.id, editingTitle)}><Check className="w-3 h-3 text-emerald-400" /></button><button onClick={() => setEditingTitleId(null)}><X className="w-3 h-3 text-red-400" /></button></div>
                        ) : (<><p className="text-sm truncate">{conv.title}</p><p className="text-xs text-gray-500 mt-1">{formatDate(conv.updated_at)}</p></>)}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100"><button onClick={() => { setEditingTitleId(conv.id); setEditingTitle(conv.title); }}><Edit2 className="w-3 h-3 text-gray-500" /></button><button onClick={() => deleteConversation(conv.id)}><Trash2 className="w-3 h-3 text-gray-500" /></button></div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* MESSAGES */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "user" ? (
              <div className="max-w-[85%] p-4 rounded-2xl text-sm bg-gold-500 text-midnight rounded-br-none">
                <ReactMarkdown>{m.content}</ReactMarkdown>
                {m.files?.length ? (
                  <div className="mt-3">
                    <div className="grid grid-cols-2 gap-2">
                      {m.files.filter(f => f.type?.startsWith('image/')).map((file, idx) => (
                        <a key={idx} href={file.url} target="_blank" rel="noopener noreferrer" className="block"><img src={file.url} alt={file.name} className="rounded-xl w-full h-auto max-h-48 object-cover border border-white/10 hover:border-gold-500 transition-all" /></a>
                      ))}
                    </div>
                    {m.files.filter(f => !f.type?.startsWith('image/')).length > 0 && (
                      <div className="mt-2 pt-2 border-t border-white/10">
                        {m.files.filter(f => !f.type?.startsWith('image/')).map((file, idx) => (
                          <a key={idx} href={file.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-gold-500 hover:underline mt-1"><File className="w-3 h-3" /> {file.name}</a>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="max-w-[85%] p-4 rounded-2xl text-sm bg-white/10 text-ivory border border-white/5 rounded-bl-none">
                <MessageWithActions content={m.content} actions={m.actions} onActionComplete={() => {}} onPlanUpdate={handlePlanUpdate} />
              </div>
            )}
          </div>
        ))}
        
        {/* WhatsApp Suggestions */}
        {whatsappSuggestions?.show && (
          <div className="flex justify-start mt-2">
            <div className="max-w-[85%] w-full">
              <WhatsAppSuggestions
                message={whatsappSuggestions.message}
                contactName={whatsappSuggestions.contactName}
                contactNumber={whatsappSuggestions.contactNumber}
                onSend={async (text) => {
                  await executeAction("whatsapp_reply", { to: whatsappSuggestions.contactNumber, message: text });
                  setWhatsappSuggestions(null);
                }}
              />
            </div>
          </div>
        )}
        
        {executionPlan && (<div className="flex justify-start"><div className="max-w-[85%] w-full"><ExecutionGuide planId={executionPlan.planId} plan={executionPlan.plan} onComplete={handlePlanComplete} onClose={handleClosePlan} /></div></div>)}
        {selectedMode === "documents" && (<div className="flex justify-start mt-4"><div className="max-w-[85%] w-full"><ReadyToSend onInsert={(text) => setInput(prev => prev + "\n\n" + text)} /></div></div>)}
        {selectedMode === "sovereign-mode" && (<div className="flex justify-start mt-4"><div className="max-w-[85%] w-full"><DecisionMode onInsert={(text) => setInput(prev => prev + "\n\n" + text)} /></div></div>)}
        {selectedMode === "business-argent" && (<div className="flex justify-start mt-4"><div className="bg-gold-500/10 border border-gold-500/20 rounded-xl p-4 max-w-[85%] w-full"><p className="text-xs text-gold-500 mb-2">💡 Actions rapides :</p><div className="flex flex-wrap gap-2"><button onClick={() => setInput(prev => prev + " Prépare un email de prospection")} className="text-xs px-3 py-1.5 bg-white/10 rounded-full hover:bg-white/20">📧 Email pro</button><button onClick={() => setInput(prev => prev + " Compare ces deux opportunités")} className="text-xs px-3 py-1.5 bg-white/10 rounded-full hover:bg-white/20">⚖️ Comparer</button><button onClick={() => setInput(prev => prev + " Analyse cette opportunité")} className="text-xs px-3 py-1.5 bg-white/10 rounded-full hover:bg-white/20">🔍 Analyser</button></div></div></div>)}
        {isLoading && (<div className="flex justify-start"><div className="bg-white/10 p-4 rounded-2xl rounded-bl-none"><div className="flex items-center gap-1"><span className="w-2 h-2 bg-gold-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} /><span className="w-2 h-2 bg-gold-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} /><span className="w-2 h-2 bg-gold-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} /><span className="text-xs text-gray-400 ml-1">Becks écrit...</span></div></div></div>)}
        <div ref={messagesEndRef} />
      </div>

      {/* ZONE DE SAISIE */}
      <div className="shrink-0 border-t border-white/10 bg-midnight/90 backdrop-blur-lg p-3">
        <div className="relative mb-2">
          <button onClick={() => setIsModeSelectorOpen(!isModeSelectorOpen)} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs transition-colors hover:bg-white/5">
            {CurrentIcon && <CurrentIcon className={`w-3.5 h-3.5 ${currentModeConfig?.color}`} />}
            <span className="text-gray-400">{currentModeConfig?.name}</span>
            <span className="text-[10px] text-gray-600 hidden sm:inline">{currentModeConfig?.description}</span>
            <ChevronDown className={`w-3 h-3 text-gray-500 transition-transform ${isModeSelectorOpen ? "rotate-180" : ""}`} />
          </button>
          {isModeSelectorOpen && (<><div className="fixed inset-0 z-40" onClick={() => setIsModeSelectorOpen(false)} /><div className="absolute bottom-full left-0 mb-2 w-64 bg-midnight border border-white/10 rounded-xl shadow-xl z-50 py-2 max-h-80 overflow-y-auto">{modes.map((mode) => { const Icon = mode.icon; return (<button key={mode.id} onClick={() => { setSelectedMode(mode.id); setIsModeSelectorOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/5 transition-colors ${selectedMode === mode.id ? mode.bg : ""}`}><Icon className={`w-4 h-4 ${mode.color}`} /><div className="flex-1 text-left"><p className="text-gray-300 text-sm">{mode.name}</p><p className="text-[10px] text-gray-500">{mode.description}</p></div>{selectedMode === mode.id && <Check className="w-3.5 h-3.5 text-gold-500" />}</button>); })}</div></>)}
        </div>
        
        {uploadedFiles.length > 0 && (<div className="flex flex-wrap gap-2 mb-2">{uploadedFiles.map((file, idx) => (<div key={idx} className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1 text-xs">{file.type.startsWith('image/') ? '🖼️' : '📄'}<span className="truncate max-w-[100px]">{file.name}</span><button onClick={() => removeFile(idx)} className="text-gray-400 hover:text-red-400"><XCircle className="w-3 h-3" /></button></div>))}</div>)}
        {isRecording && (<div className="text-center text-xs text-red-400 animate-pulse mb-2">🎤 Enregistrement vocal... relâchez pour envoyer</div>)}
        
        <div className="flex items-center gap-2">
          <button onClick={() => document.getElementById('file-upload-input')?.click()} className="p-2 rounded-full bg-white/10 text-gray-400 hover:bg-white/20 transition-colors flex-shrink-0"><Paperclip className="w-5 h-5" /></button>
          <input id="file-upload-input" type="file" {...getInputProps()} className="hidden" />
          <input ref={inputRef} type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder={isRecording ? "🎤 Enregistrement vocal..." : `Mode ${currentModeConfig?.name} : écris ton message...`} className="flex-1 bg-white/10 border border-white/20 rounded-full py-3 px-4 text-sm focus:outline-none focus:border-gold-500 text-ivory placeholder:text-gray-500" disabled={isRecording} />
          <button
            onMouseDown={handleSendButtonMouseDown}
            onMouseUp={handleSendButtonMouseUp}
            onMouseLeave={() => { if (isRecording) stopVoiceRecording(); }}
            onTouchStart={handleSendButtonMouseDown}
            onTouchEnd={handleSendButtonMouseUp}
            onClick={() => { if (isRecording) stopVoiceRecording(); }}
            disabled={isLoading || isSending}
            className={`p-2 rounded-full transition-all flex-shrink-0 ${
              isRecording 
                ? "bg-red-500 text-white animate-pulse" 
                : "bg-gold-500 text-midnight hover:scale-105"
            } disabled:opacity-50 disabled:hover:scale-100`}
            title={isRecording ? "Enregistrement en cours... relâchez" : "Appui long pour parler"}
          >
            {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
        </div>
        
        {selectedMode === "fais-le-avec-moi" && (<div className="mt-2 text-center"><span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-gold-500/20 text-gold-400"><Sparkles className="w-3 h-3" /> Mode Exécution activé</span></div>)}
      </div>

      {/* MODALES */}
      {showChecklistModal && currentChecklist && (<div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowChecklistModal(false)}><div className="bg-midnight border border-gold-500/30 rounded-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}><div className="flex justify-between items-center mb-4"><h3 className="text-lg font-serif text-gold-500">{currentChecklist.title}</h3><button onClick={() => setShowChecklistModal(false)} className="text-gray-400 hover:text-gold-500"><X className="w-5 h-5" /></button></div><div className="space-y-3 mb-6">{currentChecklist.steps.map((step, idx) => (<div key={idx} className="flex items-center gap-3 p-2 bg-white/5 rounded-lg"><input type="checkbox" className="w-4 h-4 rounded border-gold-500 accent-gold-500" /><span className="text-sm text-ivory">{step}</span></div>))}</div><button onClick={() => setShowChecklistModal(false)} className="w-full py-2 bg-gold-500/20 text-gold-500 rounded-lg hover:bg-gold-500/30">Fermer</button></div></div>)}
      {showDraftModal && currentDraft && (<div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowDraftModal(false)}><div className="bg-midnight border border-gold-500/30 rounded-xl max-w-2xl w-full p-6" onClick={(e) => e.stopPropagation()}><div className="flex justify-between items-center mb-4"><h3 className="text-lg font-serif text-gold-500">{currentDraft.type === "email" ? "📧 Brouillon d'email" : "📄 Brouillon de document"}</h3><button onClick={() => setShowDraftModal(false)} className="text-gray-400 hover:text-gold-500"><X className="w-5 h-5" /></button></div><div className="bg-black/30 rounded-lg p-4 mb-4 max-h-96 overflow-y-auto"><pre className="text-sm text-ivory whitespace-pre-wrap font-sans">{currentDraft.content}</pre></div><div className="flex gap-3"><button onClick={() => copyToClipboard(currentDraft.content)} className="flex-1 py-2 bg-gold-500/20 text-gold-500 rounded-lg hover:bg-gold-500/30">📋 Copier</button><button onClick={() => setShowDraftModal(false)} className="flex-1 py-2 bg-white/10 text-gray-400 rounded-lg hover:bg-white/20">Fermer</button></div></div></div>)}
      {showWhatsAppModal && currentWhatsApp && (<div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"><div className="bg-midnight border border-gold-500/30 rounded-xl max-w-md w-full p-6"><h3 className="text-lg font-serif text-gold-500 mb-2">✏️ Répondre à {currentWhatsApp.to}</h3><p className="text-xs text-gray-400 mb-3">Message original : {currentWhatsApp.original_message}</p><textarea value={customReply} onChange={(e) => setCustomReply(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-lg p-3 text-sm text-ivory" rows={4} placeholder="Ta réponse..." /><div className="flex gap-2 mt-4"><button onClick={async () => { await executeAction("whatsapp_reply", { to: currentWhatsApp.to, message: customReply }); setShowWhatsAppModal(false); }} className="flex-1 py-2 bg-gold-500/20 text-gold-500 rounded-lg">📱 Envoyer</button><button onClick={() => setShowWhatsAppModal(false)} className="flex-1 py-2 bg-white/10 text-gray-400 rounded-lg">Annuler</button></div></div></div>)}
      {showLiveVoice && userId && (<LiveVoiceChat userId={userId} onClose={() => setShowLiveVoice(false)} />)}
    </div>
  );
}
