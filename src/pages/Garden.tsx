import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import { Link } from "react-router-dom";

type Pumpkin = {
  id: number;
  img: string; 
};

type PositionedPumpkin = Pumpkin & {
  left: string;
  top: string;
  rotate: number;
};

export default function Garden() {
  const [pumpkins, setPumpkins] = useState<Pumpkin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from("calabazas")
        .select("id,img")
        .order("id", { ascending: false });
      if (!mounted) return;
      if (error) {
        setError(error.message);
      } else {
        setPumpkins((data as Pumpkin[]) ?? []);
      }
      setLoading(false);
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const positioned = useMemo<PositionedPumpkin[]>(() => {
    // Random positions in viewport using percentages to avoid measuring container.
    return pumpkins.map((p) => ({
      ...p,
      left: `${Math.floor(Math.random() * 88)}%`,
      top: `${Math.floor(Math.random() * 88)}%`,
      rotate: Math.floor(Math.random() * 40) - 20,
    }));
  }, [pumpkins]);

  if (loading) {
    return <div className="w-full min-h-screen flex items-center justify-center">Cargando jardín…</div>;
  }

  if (error) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center text-red-600">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen overflow-hidden relative" >
      <div className="absolute top-4 left-4 z-10">
        <Link to="/" className="border-2 border-slate-600 rounded px-2 py-1 text-sm bg-white/70">
          Volver a dibujar
        </Link>
      </div>
      {positioned.map((p) => (
        <img
          key={p.id}
          src={p.img}
          alt={`calabaza-${p.id}`}
          style={{
            position: "absolute",
            left: p.left,
            top: p.top,
            width: 120,
            height: 120,
            objectFit: "contain",
            transform: `rotate(${p.rotate}deg) translate(-50%, -50%)`,
            transformOrigin: "center",
            filter: "drop-shadow(0 4px 16px rgba(255,165,0,0.35))",
          }}
        />
      ))}

      {positioned.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-slate-600">
          No hay calabazas aún. Vuelve y guarda una 🎃
        </div>
      )}
    </div>
  );
}
