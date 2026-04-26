"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, Crown } from "lucide-react";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signIn, signUp, user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();

  // Redirection si déjà connecté
  useEffect(() => {
    if (!isAuthLoading && user) {
      router.push("/");
    }
  }, [user, isAuthLoading, router]);

  // Pendant le chargement de l'auth, afficher un loader
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-midnight flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gold-500 animate-spin" />
      </div>
    );
  }

  // Si déjà connecté, ne rien afficher (la redirection va avoir lieu)
  if (user) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      if (isLogin) {
        await signIn(email, password);
      } else {
        await signUp(email, password);
      }
      // La redirection se fait via le useEffect
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-midnight flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 max-w-md w-full"
      >
        <div className="text-center mb-8">
          <Crown className="w-12 h-12 text-gold-500 mx-auto mb-4" />
          <h1 className="text-3xl font-serif text-gold-500">SOVEREIGN</h1>
          <p className="text-gray-500 mt-2">{isLogin ? "Connecte-toi" : "Crée ton compte"}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory focus:outline-none focus:border-gold-500"
            required
          />
          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-ivory focus:outline-none focus:border-gold-500"
            required
          />

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gold-500 text-midnight py-3 rounded-xl font-medium hover:bg-gold-400 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : (isLogin ? "Se connecter" : "Créer un compte")}
          </button>
        </form>

        <button
          onClick={() => setIsLogin(!isLogin)}
          className="w-full text-center text-gray-500 text-sm mt-4 hover:text-gold-500 transition-colors"
        >
          {isLogin ? "Pas de compte ? Crée-en un" : "Déjà un compte ? Connecte-toi"}
        </button>
      </motion.div>
    </div>
  );
}
