"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { useDropzone } from "react-dropzone";
import { 
  FileText, Clock, CheckCircle, AlertCircle, Filter, Search, 
  ExternalLink, Plus, Edit2, Trash2, X, Upload, Download,
  FolderOpen, Tag, Calendar, File, Image, FileArchive, FileSpreadsheet
} from "lucide-react";
import { toast } from "sonner";

type Document = {
  id: string;
  name: string;
  type: string;
  status: string;
  mission_id: string | null;
  due_date: string | null;
  url: string | null;
  file_url: string | null;
  file_name: string | null;
  missing_pieces: string[] | null;
  notes: string | null;
  created_at: string;
};

const documentTypeConfig = {
  proposal: { label: "📄 Proposition", color: "bg-blue-500/20 text-blue-400" },
  contract: { label: "📑 Contrat", color: "bg-purple-500/20 text-purple-400" },
  grant: { label: "🎯 Subvention", color: "bg-emerald-500/20 text-emerald-400" },
  invoice: { label: "💰 Facture", color: "bg-orange-500/20 text-orange-400" },
  legal: { label: "⚖️ Légal", color: "bg-red-500/20 text-red-400" },
  admin: { label: "📋 Administratif", color: "bg-cyan-500/20 text-cyan-400" },
  other: { label: "📁 Autre", color: "bg-gray-500/20 text-gray-400" }
};

const statusConfig = {
  draft: { label: "📝 Brouillon", icon: Edit2, color: "bg-yellow-500/20 text-yellow-400" },
  review: { label: "🔍 En relecture", icon: Clock, color: "bg-blue-500/20 text-blue-400" },
  ready: { label: "✅ Prêt", icon: CheckCircle, color: "bg-emerald-500/20 text-emerald-400" },
  submitted: { label: "📤 Soumis", icon: Upload, color: "bg-purple-500/20 text-purple-400" },
  approved: { label: "⭐ Approuvé", icon: CheckCircle, color: "bg-green-500/20 text-green-400" },
  rejected: { label: "❌ Rejeté", icon: AlertCircle, color: "bg-red-500/20 text-red-400" }
};

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    type: "other",
    status: "draft",
    due_date: "",
    url: "",
    file_url: "",
    file_name: "",
    missing_pieces: "",
    notes: ""
  });

  useEffect(() => {
    fetchDocuments();
    
    const channel = supabase
      .channel('documents_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'documents' }, () => fetchDocuments())
      .subscribe();
    
    return () => {   channel.unsubscribe();   
  }, []);

  async function fetchDocuments() {
    setIsLoading(true);
    const { data } = await supabase
      .from("documents")
      .select("*")
      .order("created_at", { ascending: false });
    setDocuments(data || []);
    setIsLoading(false);
  }

  // Upload de fichier vers Supabase Storage
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    
    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `documents/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);
      
      setFormData(prev => ({
        ...prev,
        file_url: publicUrl,
        file_name: file.name
      }));
      
      toast.success("Fichier uploadé avec succès");
    } catch (error) {
      console.error("Erreur upload:", error);
      toast.error("Erreur lors de l'upload");
    } finally {
      setIsUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc', '.docx'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
      'application/vnd.ms-excel': ['.xls', '.xlsx'],
      'application/zip': ['.zip', '.rar']
    },
    maxFiles: 1
  });

  async function saveDocument() {
    const data = {
      name: formData.name,
      type: formData.type,
      status: formData.status,
      due_date: formData.due_date || null,
      url: formData.url || null,
      file_url: formData.file_url || null,
      file_name: formData.file_name || null,
      missing_pieces: formData.missing_pieces ? formData.missing_pieces.split(",").map(s => s.trim()) : null,
      notes: formData.notes || null
    };
    
    let error;
    if (editingDoc) {
      const result = await supabase.from("documents").update(data).eq("id", editingDoc.id);
      error = result.error;
    } else {
      const result = await supabase.from("documents").insert(data);
      error = result.error;
    }
    
    if (!error) {
      resetForm();
      fetchDocuments();
      toast.success(editingDoc ? "Document modifié" : "Document ajouté");
    } else {
      toast.error("Erreur: " + error.message);
    }
  }

  async function updateStatus(id: string, newStatus: string) {
    const { error } = await supabase.from("documents").update({ status: newStatus }).eq("id", id);
    if (!error) fetchDocuments();
  }

  async function deleteDocument(id: string) {
    if (confirm("Supprimer ce document ?")) {
      const { error } = await supabase.from("documents").delete().eq("id", id);
      if (!error) {
        fetchDocuments();
        toast.success("Document supprimé");
      }
    }
  }

  function editDocument(doc: Document) {
    setEditingDoc(doc);
    setFormData({
      name: doc.name,
      type: doc.type,
      status: doc.status,
      due_date: doc.due_date || "",
      url: doc.url || "",
      file_url: doc.file_url || "",
      file_name: doc.file_name || "",
      missing_pieces: doc.missing_pieces ? doc.missing_pieces.join(", ") : "",
      notes: doc.notes || ""
    });
    setShowForm(true);
  }

  function resetForm() {
    setShowForm(false);
    setEditingDoc(null);
    setFormData({
      name: "",
      type: "other",
      status: "draft",
      due_date: "",
      url: "",
      file_url: "",
      file_name: "",
      missing_pieces: "",
      notes: ""
    });
  }

  const filteredDocuments = documents.filter(doc => {
    const matchesFilter = filter === "all" || doc.status === filter;
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const stats = {
    total: documents.length,
    pending: documents.filter(d => d.status === "draft" || d.status === "review").length,
    completed: documents.filter(d => d.status === "approved" || d.status === "ready").length,
    submitted: documents.filter(d => d.status === "submitted").length
  };

  const getFileIcon = (fileName: string) => {
    if (!fileName) return <File className="w-4 h-4" />;
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return <FileText className="w-4 h-4 text-red-400" />;
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) return <Image className="w-4 h-4 text-blue-400" />;
    if (['zip', 'rar', '7z'].includes(ext || '')) return <FileArchive className="w-4 h-4 text-yellow-400" />;
    if (['xls', 'xlsx', 'csv'].includes(ext || '')) return <FileSpreadsheet className="w-4 h-4 text-green-400" />;
    return <File className="w-4 h-4" />;
  };

  return (
    <div className="p-8 lg:p-12 h-full flex flex-col overflow-y-auto bg-midnight">
      {/* HEADER */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <motion.h1 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-serif text-gold-500 tracking-tight"
          >
            Documents & Deals
          </motion.h1>
          <p className="text-gray-500 mt-2 italic font-light">
            Gestion des contrats, factures et documents importants
          </p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingDoc(null); }}
          className="bg-gold-500 text-midnight px-5 py-2 rounded-full text-sm font-medium flex items-center gap-2 hover:bg-gold-400 transition-colors"
        >
          <Plus className="w-4 h-4" /> Nouveau document
        </button>
      </div>

      {/* STATISTIQUES */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
          <FileText className="w-6 h-6 text-gold-500 mx-auto mb-2" />
          <div className="text-2xl font-serif text-ivory">{stats.total}</div>
          <div className="text-xs text-gray-500 uppercase">Total documents</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
          <Clock className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
          <div className="text-2xl font-serif text-yellow-400">{stats.pending}</div>
          <div className="text-xs text-gray-500 uppercase">En attente</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
          <Upload className="w-6 h-6 text-purple-400 mx-auto mb-2" />
          <div className="text-2xl font-serif text-purple-400">{stats.submitted}</div>
          <div className="text-xs text-gray-500 uppercase">Soumis</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
          <CheckCircle className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
          <div className="text-2xl font-serif text-emerald-400">{stats.completed}</div>
          <div className="text-xs text-gray-500 uppercase">Validés</div>
        </div>
      </div>

      {/* RECHERCHE ET FILTRES */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Rechercher un document..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-ivory placeholder:text-gray-500 focus:outline-none focus:border-gold-500 transition-all"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-full text-sm transition-all ${filter === "all" ? "bg-gold-500 text-midnight" : "bg-white/5 text-gray-400 hover:bg-white/10"}`}
          >
            Tous
          </button>
          <button 
            onClick={() => setFilter("draft")}
            className={`px-4 py-2 rounded-full text-sm transition-all ${filter === "draft" ? "bg-yellow-500 text-midnight" : "bg-white/5 text-gray-400 hover:bg-white/10"}`}
          >
            📝 Brouillons
          </button>
          <button 
            onClick={() => setFilter("review")}
            className={`px-4 py-2 rounded-full text-sm transition-all ${filter === "review" ? "bg-blue-500 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10"}`}
          >
            🔍 Relecture
          </button>
          <button 
            onClick={() => setFilter("submitted")}
            className={`px-4 py-2 rounded-full text-sm transition-all ${filter === "submitted" ? "bg-purple-500 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10"}`}
          >
            📤 Soumis
          </button>
          <button 
            onClick={() => setFilter("approved")}
            className={`px-4 py-2 rounded-full text-sm transition-all ${filter === "approved" ? "bg-emerald-500 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10"}`}
          >
            ✅ Approuvés
          </button>
        </div>
      </div>

      {/* FORMULAIRE AVEC UPLOAD */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-serif text-ivory">{editingDoc ? "Modifier" : "Nouveau"} document</h3>
              <button onClick={resetForm} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Nom du document"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory md:col-span-2"
              />
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory"
              >
                {Object.entries(documentTypeConfig).map(([key, conf]) => (
                  <option key={key} value={key}>{conf.label}</option>
                ))}
              </select>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory"
              >
                {Object.entries(statusConfig).map(([key, conf]) => (
                  <option key={key} value={key}>{conf.label}</option>
                ))}
              </select>
              <input
                type="date"
                placeholder="Date d'échéance"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory"
              />
              
              {/* Zone d'upload */}
              <div className="md:col-span-2">
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                    isDragActive ? "border-gold-500 bg-gold-500/10" : "border-white/20 hover:border-gold-500/50"
                  }`}
                >
                  <input {...getInputProps()} />
                  <Upload className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">
                    {isDragActive ? "Dépose le fichier ici..." : "Glisse ou clique pour uploader un fichier"}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">PDF, Word, Excel, Images, ZIP (max 50MB)</p>
                </div>
                {isUploading && (
                  <div className="mt-2 text-center text-sm text-gold-500 animate-pulse">
                    Upload en cours...
                  </div>
                )}
                {formData.file_name && (
                  <div className="mt-2 p-2 bg-gold-500/10 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getFileIcon(formData.file_name)}
                      <span className="text-xs text-ivory">{formData.file_name}</span>
                    </div>
                    <button
                      onClick={() => setFormData({ ...formData, file_url: "", file_name: "" })}
                      className="text-gray-500 hover:text-red-400"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              <input
                type="url"
                placeholder="Ou un lien externe (Google Drive, Dropbox...)"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory md:col-span-2"
              />
              
              <input
                type="text"
                placeholder="Pièces manquantes (séparées par des virgules)"
                value={formData.missing_pieces}
                onChange={(e) => setFormData({ ...formData, missing_pieces: e.target.value })}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory md:col-span-2"
              />
              
              <textarea
                placeholder="Notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-gold-500 text-ivory md:col-span-2"
                rows={2}
              />
            </div>
            
            <div className="flex gap-3 mt-6">
              <button onClick={saveDocument} className="bg-gold-500 text-midnight px-6 py-2 rounded-full font-medium hover:bg-gold-400 transition-colors">
                {editingDoc ? "Mettre à jour" : "Enregistrer"}
              </button>
              <button onClick={resetForm} className="bg-white/10 px-6 py-2 rounded-full hover:bg-white/20 transition-colors">Annuler</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LISTE DES DOCUMENTS */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="text-left p-4 text-xs uppercase tracking-wider text-gray-500">Document</th>
                <th className="text-left p-4 text-xs uppercase tracking-wider text-gray-500">Échéance</th>
                <th className="text-left p-4 text-xs uppercase tracking-wider text-gray-500">Type</th>
                <th className="text-left p-4 text-xs uppercase tracking-wider text-gray-500">Statut</th>
                <th className="text-left p-4 text-xs uppercase tracking-wider text-gray-500">Fichier</th>
                <th className="text-left p-4 text-xs uppercase tracking-wider text-gray-500"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-500">
                    <div className="animate-pulse">Chargement des documents...</div>
                  </td>
                </tr>
              ) : filteredDocuments.length > 0 ? (
                filteredDocuments.map((doc) => {
                  const statusConf = statusConfig[doc.status as keyof typeof statusConfig] || statusConfig.draft;
                  const StatusIcon = statusConf.icon;
                  
                  return (
                    <tr key={doc.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="p-4">
                        <div>
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-gold-500/60" />
                            <span className="text-ivory font-medium">{doc.name}</span>
                          </div>
                          {doc.notes && (
                            <p className="text-xs text-gray-600 mt-1 ml-8">{doc.notes}</p>
                          )}
                          {doc.missing_pieces && doc.missing_pieces.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1 ml-8">
                              {doc.missing_pieces.map((piece, i) => (
                                <span key={i} className="text-xs text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full">
                                  ⚠️ {piece}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-gray-400 text-sm">
                        {doc.due_date ? (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(doc.due_date).toLocaleDateString('fr-FR')}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs ${documentTypeConfig[doc.type as keyof typeof documentTypeConfig]?.color || "bg-gray-500/20 text-gray-400"}`}>
                          {documentTypeConfig[doc.type as keyof typeof documentTypeConfig]?.label.split(" ")[1] || doc.type}
                        </span>
                      </td>
                      <td className="p-4">
                        <select
                          value={doc.status}
                          onChange={(e) => updateStatus(doc.id, e.target.value)}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border focus:outline-none ${statusConf.color}`}
                        >
                          {Object.entries(statusConfig).map(([key, conf]) => (
                            <option key={key} value={key}>{conf.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-4">
                        {(doc.file_url || doc.url) && (
                          <a 
                            href={doc.file_url || doc.url || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-500 hover:text-gold-500 transition-colors flex items-center gap-1"
                          >
                            {getFileIcon(doc.file_name || "")}
                            <span className="text-xs">Ouvrir</span>
                          </a>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => editDocument(doc)} className="text-gray-500 hover:text-gold-500">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => deleteDocument(doc.id)} className="text-gray-500 hover:text-red-400">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p>Aucun document trouvé</p>
                    <p className="text-sm mt-2">Clique sur "Nouveau document" pour commencer</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
