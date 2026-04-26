import { useEffect, useState } from "react";
import TeamShowcase, { type TeamMember } from "@/components/ui/team-showcase";
import { apiUrl } from "@/lib/api";

export default function CouncilTeamIsland() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(apiUrl("/api/council"));
        const data = await res.json();
        const positions = data.positions || [];
        const flat: TeamMember[] = [];
        for (const p of positions) {
          for (const m of p.members || []) {
            const hasPhoto = Boolean(m.photo_key);
            const image = hasPhoto
              ? apiUrl("/api/council/photo/" + m.id)
              : `https://picsum.photos/seed/cmp-m${m.id}/400/480`;
            flat.push({
              id: String(m.id),
              name: m.full_name,
              role: p.name,
              image,
            });
          }
        }
        if (!cancelled) {
          setMembers(flat);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setErr("Error al cargar el consejo.");
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <p className="text-slate-600 dark:text-slate-400">Cargando…</p>;
  }
  if (err) {
    return <p className="text-sm text-red-600">{err}</p>;
  }
  return <TeamShowcase members={members} />;
}
