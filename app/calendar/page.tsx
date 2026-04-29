"use client";
import { useEffect, useState } from "react";
import LoadingSpinner from "@/components/LoadingSpinner";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import { 
  Calendar, ChevronLeft, ChevronRight, Clock, 
  CheckCircle, AlertCircle, Target, Heart, DollarSign,
  Briefcase, Sprout, FileText, Plus
} from "lucide-react";
import Link from "next/link";

type Task = {
  id: string;
  title: string;
  due_date: string | null;
  status: string;
  priority: string;
  area: string;
};

type FamilyEvent = {
  id: string;
  title: string;
  date: string | null;
  child_name: string | null;
  category: string;
  priority: string;
};

type FarmTask = {
  id: string;
  title: string;
  due_date: string | null;
  status: string;
};

type Document = {
  id: string;
  name: string;
  due_date: string | null;
  status: string;
};

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [familyEvents, setFamilyEvents] = useState<FamilyEvent[]>([]);
  const [farmTasks, setFarmTasks] = useState<FarmTask[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedEvents, setSelectedEvents] = useState<any[]>([]);

  useEffect(() => {
    fetchAllData();
  }, []);

  async function fetchAllData() {
    setIsLoading(true);
    await Promise.all([
      fetchTasks(),
      fetchFamilyEvents(),
      fetchFarmTasks(),
      fetchDocuments()
    ]);
    setIsLoading(false);
  }

  async function fetchTasks() {
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .neq("status", "done")
      .order("due_date", { ascending: true });
    setTasks(data || []);
  }

  async function fetchFamilyEvents() {
    const { data } = await supabase
      .from("family_events")
      .select("*")
      .order("date", { ascending: true });
    setFamilyEvents(data || []);
  }

  async function fetchFarmTasks() {
    const { data } = await supabase
      .from("relocation_tasks")
      .select("*")
      .neq("status", "completed")
      .order("due_date", { ascending: true });
    setFarmTasks(data || []);
  }

  async function fetchDocuments() {
    const { data } = await supabase
      .from("documents")
      .select("*")
      .neq("status", "approved")
      .order("due_date", { ascending: true });
    setDocuments(data || []);
  }

  const getAreaIcon = (area: string) => {
    switch(area) {
      case "business": return <Briefcase className="w-3 h-3" />;
      case "family": return <Heart className="w-3 h-3" />;
      case "money": return <DollarSign className="w-3 h-3" />;
      case "farm": return <Sprout className="w-3 h-3" />;
      case "self": return <Target className="w-3 h-3" />;
      default: return <Clock className="w-3 h-3" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case "critical": return "text-red-400 bg-red-500/10";
      case "high": return "text-orange-400 bg-orange-500/10";
      case "normal": return "text-blue-400 bg-blue-500/10";
      default: return "text-gray-400 bg-gray-500/10";
    }
  };

  // Fonctions calendrier
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    setSelectedDate(null);
    setSelectedEvents([]);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    setSelectedDate(null);
    setSelectedEvents([]);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(null);
    setSelectedEvents([]);
  };

  const getEventsForDate = (year: number, month: number, day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    const dayEvents = [
      ...tasks.filter(t => t.due_date === dateStr).map(t => ({ ...t, type: "task", area: t.area })),
      ...familyEvents.filter(f => f.date === dateStr).map(f => ({ ...f, type: "family", title: f.title })),
      ...farmTasks.filter(ft => ft.due_date === dateStr).map(ft => ({ ...ft, type: "farm", title: ft.title })),
      ...documents.filter(d => d.due_date === dateStr).map(d => ({ ...d, type: "document", title: d.name }))
    ];
    
    return dayEvents;
  };

  const handleDateClick = (year: number, month: number, day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const events = getEventsForDate(year, month, day);
    setSelectedDate(dateStr);
    setSelectedEvents(events);
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
  const dayNames = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

  // Ajuster l'index du premier jour (lundi comme premier jour)
  const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;

return (
  <div className="h-full flex flex-col overflow-y-auto bg-midnight">
    {isLoading ? (
      <LoadingSpinner />
    ) : (
      <>
          {/* HEADER - VERSION RESPONSIVE */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl md:text-4xl font-serif text-gold-500 tracking-tight">Calendar</h1>
              <p className="text-gray-500 mt-1 text-sm md:text-base">
                Vue d'ensemble des échéances et événements
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <button
                onClick={goToToday}
                className="bg-white/5 border border-white/10 px-4 py-2 rounded-full text-sm hover:bg-white/10 transition-colors w-full sm:w-auto"
              >
                Aujourd'hui
              </button>
              <Link
                href="/tasks/new"
                className="bg-gold-500 text-midnight px-4 py-2 rounded-full text-sm font-medium flex items-center justify-center gap-2 hover:bg-gold-400 transition-colors w-full sm:w-auto"
              >
                <Plus className="w-4 h-4" /> Ajouter
              </Link>
            </div>
          </div>

        {/* LÉGENDE */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-gray-400">Tâches</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-pink-500" />
            <span className="text-gray-400">Famille</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-gray-400">Ferme</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <span className="text-gray-400">Documents</span>
          </div>
        </div>

        {/* CALENDRIER */}
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          {/* En-tête mois */}
          <div className="flex justify-between items-center p-4 border-b border-white/10">
            <button onClick={prevMonth} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-serif text-gold-500">
              {monthNames[month]} {year}
            </h2>
            <button onClick={nextMonth} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Jours de la semaine */}
          <div className="grid grid-cols-7 border-b border-white/10">
            {dayNames.map(day => (
              <div key={day} className="p-3 text-center text-xs text-gray-500 font-medium">
                {day}
              </div>
            ))}
          </div>

          {/* Jours du mois */}
          <div className="grid grid-cols-7 auto-rows-fr">
            {Array.from({ length: adjustedFirstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[100px] p-2 border-r border-b border-white/5 bg-black/20" />
            ))}
            
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const events = getEventsForDate(year, month, day);
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDate;
              
              const taskCount = events.filter(e => e.type === "task").length;
              const familyCount = events.filter(e => e.type === "family").length;
              const farmCount = events.filter(e => e.type === "farm").length;
              const docCount = events.filter(e => e.type === "document").length;
              
              return (
                <div
                  key={day}
                  onClick={() => handleDateClick(year, month, day)}
                  className={`min-h-[100px] p-2 border-r border-b border-white/5 cursor-pointer transition-all hover:bg-white/5 ${
                    isToday ? "bg-gold-500/5" : ""
                  } ${isSelected ? "bg-gold-500/10 border-gold-500/30" : ""}`}
                >
                  <div className={`text-right mb-1 ${isToday ? "text-gold-500 font-bold" : "text-gray-400"}`}>
                    {day}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {taskCount > 0 && (
                      <div className="w-2 h-2 rounded-full bg-blue-500" title={`${taskCount} tâche(s)`} />
                    )}
                    {familyCount > 0 && (
                      <div className="w-2 h-2 rounded-full bg-pink-500" title={`${familyCount} événement(s) familial(aux)`} />
                    )}
                    {farmCount > 0 && (
                      <div className="w-2 h-2 rounded-full bg-green-500" title={`${farmCount} tâche(s) ferme`} />
                    )}
                    {docCount > 0 && (
                      <div className="w-2 h-2 rounded-full bg-orange-500" title={`${docCount} document(s)`} />
                    )}
                  </div>
                  {events.length > 0 && (
                    <div className="mt-1 text-[10px] text-gray-500 truncate">
                      {events.length} événement(s)
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* DÉTAIL DU JOUR SÉLECTIONNÉ */}
        {selectedDate && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 bg-white/5 border border-white/10 rounded-2xl p-6"
          >
            <h2 className="text-lg font-serif text-gold-500 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Événements du {new Date(selectedDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h2>
            
            {selectedEvents.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Aucun événement prévu ce jour</p>
            ) : (
              <div className="space-y-3">
                {selectedEvents.map((event, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-midnight rounded-xl border border-white/5">
                    <div className="flex items-center gap-3">
                      {event.type === "task" && <Target className="w-4 h-4 text-blue-400" />}
                      {event.type === "family" && <Heart className="w-4 h-4 text-pink-400" />}
                      {event.type === "farm" && <Sprout className="w-4 h-4 text-green-400" />}
                      {event.type === "document" && <FileText className="w-4 h-4 text-orange-400" />}
                      <div>
                        <p className="text-ivory text-sm">{event.title}</p>
                        <p className="text-xs text-gray-500 capitalize">{event.type}</p>
                      </div>
                    </div>
                    {event.priority && (
                      <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(event.priority)}`}>
                        {event.priority === "critical" ? "Critical" : 
                         event.priority === "high" ? "Haute" :
                         event.priority === "normal" ? "Normale" : "Basse"}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </>
    )}
  </div>
);
}
