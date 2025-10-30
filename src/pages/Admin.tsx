import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

type Pumpkin = {
  id: number;
  img: string;
  visible?: boolean;
};

export default function Admin() {
  const [passwordInput, setPasswordInput] = useState("");
  const [authed, setAuthed] = useState(false);
  const [pending, setPending] = useState<Pumpkin[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || "";
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

  const tryAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ADMIN_PASSWORD) {
      alert("Falta VITE_ADMIN_PASSWORD en el entorno");
      return;
    }
    setAuthed(passwordInput === ADMIN_PASSWORD);
    if (passwordInput !== ADMIN_PASSWORD) {
      setError("Contraseña incorrecta :(");
      setTimeout(() => setError(null), 2000);
    }
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("calabazas")
      .select("id,img,visible")
      .eq("visible", false)
      .order("id", { ascending: false });
    if (error) setError(error.message);
    setPending((data as Pumpkin[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (authed) {
      load();
    }
  }, [authed]);

  const moderate = async (id: number, action: 'approve' | 'reject') => {
    try {
      const response = await fetch(
        `${supabaseUrl}/functions/v1/moderate-pumpkin`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
          },
          body: JSON.stringify({ 
            action,
            pumpkinId: id,
            adminPassword: ADMIN_PASSWORD
          })
        }
      );

      const result = await response.json();

      if (!response.ok) {
        alert(result.error || `Error al ${action === 'approve' ? 'aprobar' : 'rechazar'}`);
        return;
      }

      // Remover de la lista local
      setPending((prev) => prev.filter((p) => p.id !== id));
      
    } catch (error) {
      console.error('Error moderando:', error);
      alert('Error de conexión');
    }
  };

  const approve = async (id: number) => {
    await moderate(id, 'approve');
  };

  const remove = async (id: number) => {
    await moderate(id, 'reject');
  };

  if (!authed) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center p-4">
        <form onSubmit={tryAuth} className="border rounded p-4 flex flex-col gap-2 max-w-sm w-full">
          <h1 className="text-lg font-semibold">Acceso administrador</h1>
          <input
            type="password"
            placeholder="Contraseña"
            className="border rounded px-2 py-1"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
          />
          <button type="submit" className="border-2 border-slate-600 rounded px-2 py-1 text-sm">Entrar</button>
          {error && <div className="text-red-600 text-sm">{error}</div>}
        </form>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Pendientes de aprobación</h1>
        <div className="flex gap-2">
          <button onClick={load} className="border-2 border-slate-600 rounded px-2 py-1 text-sm">Refrescar</button>
        </div>
      </div>

      {loading && <div>Cargando…</div>}
      {error && <div className="text-red-600">{error}</div>}

      {pending.length === 0 && !loading ? (
        <div className="text-slate-600">No hay calabazas pendientes.</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {pending.map((p) => (
            <div key={p.id} className="border rounded p-2 flex flex-col items-center gap-2">
              <img src={p.img} alt={`calabaza-${p.id}`} className="w-full h-32 object-contain" />
              <div className="flex gap-2 w-full">
                <button onClick={() => approve(p.id)} className="flex-1 border-2 border-green-600 text-green-700 rounded px-2 py-1 text-sm">Aprobar</button>
                <button onClick={() => remove(p.id)} className="flex-1 border-2 border-red-600 text-red-700 rounded px-2 py-1 text-sm">Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}