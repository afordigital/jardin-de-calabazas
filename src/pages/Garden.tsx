import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import { Link } from "react-router-dom";

type Pumpkin = {
  id: number;
  img: string; 
};

type PositionedPumpkin = Pumpkin & {
  left: number;
  top: number;
  rotate: number;
};

type GardenProps = {
  embedded?: boolean;
  width?: number;
  height?: number;
};

export default function Garden({ embedded, width: propWidth, height: propHeight }: GardenProps) {
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
        .eq("visible", true)
        .order("id", { ascending: false });
      if (!mounted) return;
      if (error) {
        setError(error.message);
      } else {
        const items = ((data as Pumpkin[]) ?? []).slice();
        for (let i = items.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [items[i], items[j]] = [items[j], items[i]];
        }
        setPumpkins(items.slice(0, 20));
      }
      setLoading(false);
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const positioned = useMemo<PositionedPumpkin[]>(() => {
    const width = propWidth !== undefined ? propWidth : (window.innerWidth || 1200);
    const height = propHeight !== undefined ? propHeight : (window.innerHeight || 800);
    const size = 120;
    const padding = 8;
    const minX = size / 2 + padding;
    const maxX = Math.max(minX, width - size / 2 - padding);
    const minY = size / 2 + padding;
    const maxY = Math.max(minY, height - size / 2 - padding);
    const placed: PositionedPumpkin[] = [];
    const maxTries = 200;

    const collides = (x: number, y: number) => {
      for (const q of placed) {
        const dx = x - q.left;
        const dy = y - q.top;
        const dist2 = dx * dx + dy * dy;
        const minDist = size * 0.9;
        if (dist2 < minDist * minDist) return true;
      }
      return false;
    };

    for (const p of pumpkins) {
      let x = minX;
      let y = minY;
      let tries = 0;
      do {
        x = Math.random() * (maxX - minX) + minX;
        y = Math.random() * (maxY - minY) + minY;
        tries++;
      } while (collides(x, y) && tries < maxTries);

      placed.push({
        ...p,
        left: x,
        top: y,
        rotate: Math.floor(Math.random() * 40) - 20,
      });
    }

    return placed;
  }, [pumpkins, propWidth, propHeight]);

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
    <div className={`overflow-hidden relative ${embedded ? "" : "w-full min-h-screen"}`} style={embedded ? { width: propWidth, height: propHeight } : undefined} >
      {!embedded && (
        <div className="absolute top-4 left-4 z-10">
          <Link to="/" className="border-2 border-slate-600 rounded px-2 py-1 text-sm bg-white/70">
            Volver a dibujar
          </Link>
        </div>
      )}
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

