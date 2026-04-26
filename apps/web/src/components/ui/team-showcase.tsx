import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useCallback, useEffect, useState, type MouseEvent } from "react";
import { FaBehance, FaInstagram, FaLinkedinIn, FaTwitter } from "react-icons/fa";
import {
  defaultPublicUiConfig,
  type PublicUiConfig,
  resolveCouncilUi,
} from "@/lib/public-ui";
import { cn } from "@/lib/utils";

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  image: string;
  bio?: string;
  email?: string | null;
  phone?: string | null;
  social?: {
    twitter?: string;
    linkedin?: string;
    instagram?: string;
    behance?: string;
  };
}

interface TeamShowcaseProps {
  members?: TeamMember[];
  /** Apariencia desde panel admin (/api/public/ui). */
  publicUi?: PublicUiConfig;
}

export default function TeamShowcase({ members = [], publicUi }: TeamShowcaseProps) {
  const uiCfg = publicUi ?? defaultPublicUiConfig;
  const resolved = resolveCouncilUi(uiCfg);
  const [selected, setSelected] = useState<TeamMember | null>(null);

  const close = useCallback(() => setSelected(null), []);

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, close]);

  if (members.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">No hay consejales para mostrar.</p>
    );
  }

  const col1 = members.filter((_, i) => i % 3 === 0);
  const col2 = members.filter((_, i) => i % 3 === 1);
  const col3 = members.filter((_, i) => i % 3 === 2);

  const open = (m: TeamMember) => setSelected(m);

  return (
    <>
      <div className="mx-auto flex w-full max-w-5xl flex-col items-start gap-8 px-4 py-8 font-sans md:flex-row md:gap-10 lg:gap-14">
        <div className="flex flex-shrink-0 gap-2 overflow-x-auto pb-1 md:gap-3 md:pb-0">
          <div className="flex flex-col gap-2 md:gap-3">
            {col1.map((member) => (
              <PhotoCard key={member.id} member={member} className={resolved.photoCol1} resolved={resolved} onOpen={open} />
            ))}
          </div>
          <div className="mt-[48px] flex flex-col gap-2 sm:mt-[56px] md:mt-[68px] md:gap-3">
            {col2.map((member) => (
              <PhotoCard key={member.id} member={member} className={resolved.photoCol2} resolved={resolved} onOpen={open} />
            ))}
          </div>
          <div className="mt-[22px] flex flex-col gap-2 sm:mt-[26px] md:mt-[32px] md:gap-3">
            {col3.map((member) => (
              <PhotoCard key={member.id} member={member} className={resolved.photoCol3} resolved={resolved} onOpen={open} />
            ))}
          </div>
        </div>

        <div className="flex w-full flex-1 flex-col gap-4 pt-0 sm:grid sm:grid-cols-2 md:flex md:flex-col md:gap-5 md:pt-2">
          {members.map((member) => (
            <MemberRow key={member.id} member={member} onOpen={open} />
          ))}
        </div>
      </div>

      <AnimatePresence>
        {selected && (
          <>
            <motion.button
              type="button"
              aria-label="Cerrar"
              className="fixed inset-0 z-[60] bg-background/75 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={close}
            />
            {/* Flex centering: motion `y` was overriding Tailwind -translate (modal drifted down). */}
            <div
              className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none"
              role="presentation"
            >
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-labelledby="council-modal-title"
                className={cn(
                  "relative flex max-h-[min(90vh,calc(100dvh-2rem))] w-full flex-col overflow-hidden border border-border bg-card shadow-2xl",
                  resolved.modalRounded,
                  resolved.modalMaxClass,
                )}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              >
              <button
                type="button"
                className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm ring-1 ring-border transition hover:bg-muted"
                onClick={close}
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="min-h-0 flex-1 overflow-y-auto">
                <div className={cn("relative aspect-[4/3] w-full overflow-hidden bg-muted sm:aspect-[16/10]", resolved.modalRounded)}>
                  <img
                    src={selected.image}
                    alt=""
                    className="h-full w-full object-cover"
                    style={{ filter: "none" }}
                  />
                  <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-background/95 to-transparent" />
                </div>
                <div className="space-y-4 p-6 sm:p-8">
                  <div>
                    <h2 id="council-modal-title" className="text-2xl font-bold tracking-tight text-foreground">
                      {selected.name}
                    </h2>
                    <p className="mt-1 text-sm font-medium uppercase tracking-wider text-muted-foreground">{selected.role}</p>
                  </div>

                  {selected.bio ? (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{selected.bio}</p>
                  ) : (
                    <p className="text-sm italic text-muted-foreground">Sin biografía publicada.</p>
                  )}

                  <div className="flex flex-wrap gap-3 text-sm">
                    {selected.email ? (
                      <a className="font-medium text-primary hover:underline" href={`mailto:${selected.email}`}>
                        {selected.email}
                      </a>
                    ) : null}
                    {selected.phone ? (
                      <a className="font-medium text-primary hover:underline" href={`tel:${selected.phone.replace(/\s/g, "")}`}>
                        {selected.phone}
                      </a>
                    ) : null}
                  </div>

                  <SocialRow member={selected} />
                </div>
              </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function PhotoCard({
  member,
  className,
  resolved,
  onOpen,
}: {
  member: TeamMember;
  className: string;
  resolved: ReturnType<typeof resolveCouncilUi>;
  onOpen: (m: TeamMember) => void;
}) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => onOpen(member)}
      aria-label={`Ver ficha de ${member.name}`}
    >
      <img
        src={member.image}
        alt=""
        className="h-full w-full object-cover"
        style={{
          filter: resolved.photoGrayscale ? "grayscale(1) brightness(0.88)" : "none",
        }}
      />
    </button>
  );
}

function MemberRow({ member, onOpen }: { member: TeamMember; onOpen: (m: TeamMember) => void }) {
  const hasSocial =
    member.social?.twitter ??
    member.social?.linkedin ??
    member.social?.instagram ??
    member.social?.behance;

  return (
    <div
      role="button"
      tabIndex={0}
      className="w-full cursor-pointer rounded-lg px-1 py-1 text-left transition-colors hover:bg-muted/60 focus-visible:outline focus-visible:ring-2 focus-visible:ring-ring"
      onClick={() => onOpen(member)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(member);
        }
      }}
    >
      <div className="flex items-center gap-2.5">
        <span className="h-3 w-4 flex-shrink-0 rounded-[5px] bg-foreground/25" />
        <span className="text-base font-semibold leading-none tracking-tight text-foreground md:text-[18px]">{member.name}</span>

        {hasSocial && (
          <div className="ml-0.5 flex items-center gap-1.5">
            <SocialRow member={member} compact stopRowOpen />
          </div>
        )}
      </div>
      <p className="mt-1.5 pl-[27px] text-[7px] font-medium uppercase tracking-[0.2em] text-muted-foreground md:text-[10px]">
        {member.role}
      </p>
    </div>
  );
}

function SocialRow({ member, compact, stopRowOpen }: { member: TeamMember; compact?: boolean; stopRowOpen?: boolean }) {
  const icon = compact ? 10 : 14;
  const pad = compact ? "p-1" : "p-1.5";
  const stop = (e: MouseEvent) => {
    if (stopRowOpen) e.stopPropagation();
  };
  if (
    !member.social?.twitter &&
    !member.social?.linkedin &&
    !member.social?.instagram &&
    !member.social?.behance
  ) {
    return null;
  }
  return (
    <div className={cn("flex flex-wrap items-center gap-2", !compact && "pt-2")}>
      {member.social?.twitter && (
        <a
          href={member.social.twitter}
          target="_blank"
          rel="noopener noreferrer"
          onClick={stop}
          className={cn(
            "rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground",
            pad,
          )}
          title="X / Twitter"
        >
          <FaTwitter size={icon} />
        </a>
      )}
      {member.social?.linkedin && (
        <a
          href={member.social.linkedin}
          target="_blank"
          rel="noopener noreferrer"
          onClick={stop}
          className={cn("rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground", pad)}
          title="LinkedIn"
        >
          <FaLinkedinIn size={icon} />
        </a>
      )}
      {member.social?.instagram && (
        <a
          href={member.social.instagram}
          target="_blank"
          rel="noopener noreferrer"
          onClick={stop}
          className={cn("rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground", pad)}
          title="Instagram"
        >
          <FaInstagram size={icon} />
        </a>
      )}
      {member.social?.behance && (
        <a
          href={member.social.behance}
          target="_blank"
          rel="noopener noreferrer"
          onClick={stop}
          className={cn("rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground", pad)}
          title="Behance"
        >
          <FaBehance size={icon} />
        </a>
      )}
    </div>
  );
}
