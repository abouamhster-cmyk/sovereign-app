"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function TestNotificationsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState("");

  async function testNotification() {
    setIsLoading(true);
    setResult("Envoi...");
    
    try {
      const response = await fetch("https://sovereign-bridge.onrender.com/api/send-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "🧪 Test notification",
          body: "Si tu vois ce message, les notifications fonctionnent !",
          url: "/"
        })
      });
      
      const data = await response.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (error) {
      setResult("Erreur: " + String(error));
    } finally {
      setIsLoading(false);
    }
  }

  async function checkReminders() {
    setIsLoading(true);
    setResult("Vérification...");
    
    try {
      const response = await fetch("https://sovereign-bridge.onrender.com/api/check-and-notify");
      const data = await response.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (error) {
      setResult("Erreur: " + String(error));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-serif text-gold-500 mb-6">Test Notifications</h1>
      
      <div className="space-y-4">
        <button
          onClick={testNotification}
          disabled={isLoading}
          className="bg-gold-500 text-midnight px-4 py-2 rounded-full"
        >
          Tester notification
        </button>
        
        <button
          onClick={checkReminders}
          disabled={isLoading}
          className="bg-blue-500 text-white px-4 py-2 rounded-full ml-4"
        >
          Vérifier rappels
        </button>
        
        {result && (
          <pre className="mt-4 p-4 bg-white/5 rounded-xl text-xs overflow-auto">
            {result}
          </pre>
        )}
      </div>
    </div>
  );
}