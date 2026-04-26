import { useEffect, useState } from "react";
import TeamShowcase, { type TeamMember } from "@/components/ui/team-showcase";
import { apiUrl } from "@/lib/api";
import { defaultPublicUiConfig, mergePublicUiFromApi, type PublicUiConfig } from "@/lib/public-ui";

export default function CouncilTeamIsland() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [publicUi, setPublicUi] = useState<PublicUiConfig>(defaultPublicUiConfig);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [councilRes, uiRes] = await Promise.all([
          fetch(apiUrl("/api/council")),
          fetch(apiUrl("/api/public/ui")),
        ]);
        const data = await councilRes.json();
        let uiMerged = defaultPublicUiConfig;
        if (uiRes.ok) {
          const u = (await uiRes.json()) as { config?: unknown };
          uiMerged = mergePublicUiFromApi(u.config);
        }
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
              bio: m.bio ?? "",
              email: m.email ?? null,
              phone: m.phone ?? null,
            });
          }
        }
        if (!cancelled) {
          setMembers(flat);
          setPublicUi(uiMerged);
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
  return <TeamShowcase members={members} publicUi={publicUi} />;
}
