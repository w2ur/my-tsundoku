"use client";

export default function ScanError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-paper">
      <h1 className="font-serif text-3xl text-forest mb-2">Scanner indisponible</h1>
      <p className="text-subtle text-center max-w-sm mb-6">
        Impossible de lancer le scanner. Vérifiez que votre navigateur a accès à la caméra.
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="px-5 py-2.5 bg-forest text-paper rounded-full text-sm font-medium hover:bg-forest/90 transition-colors"
        >
          Réessayer
        </button>
        <a
          href="/add/manual"
          className="px-5 py-2.5 border border-border-strong rounded-full text-sm font-medium text-muted hover:bg-cream transition-colors"
        >
          Saisie manuelle
        </a>
      </div>
    </div>
  );
}
