export default function LoadingSpinner() {
  return (
    <div className="min-h-[400px] flex flex-col items-center justify-center bg-midnight">
      <div className="relative">
        <div className="w-12 h-12 border-4 border-gold-500/20 rounded-full"></div>
        <div className="w-12 h-12 border-4 border-gold-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
      </div>
      <p className="text-gray-500 text-sm mt-4 animate-pulse">Chargement...</p>
    </div>
  );
}
