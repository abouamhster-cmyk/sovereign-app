"use client";
import { useEffect, useState } from "react";

export default function DataWidget({ tableKey, title }: { tableKey: string, title: string }) {
  const [count, setCount] = useState("...");

  useEffect(() => {
    // Appel à ton API Render pour compter les lignes dans Notion
    fetch(`https://sovereign-bridge.onrender.com/get_table/${tableKey}`)
      .then(res => res.json())
      .then(data => {
        if (data.results) setCount(data.results.length.toString());
        else setCount("0");
      })
      .catch(() => setCount("Erreur"));
  }, [tableKey]);

  return (
    <div className="bg-gold-500/10 px-4 py-2 rounded-full text-gold-500 text-sm border border-gold-500/20">
      {count} {title}
    </div>
  );
}