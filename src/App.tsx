import React, { useMemo, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import {
  MapPinned,
  ThermometerSun,
  Droplets,
  Navigation,
  ShieldCheck,
  Layers,
  Mail,
  Send,
  Share2,
  ArrowRight,
  Building2,
  Trees,
  Flame,
  CheckCircle2,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

import Logo from "@/assets/UHI_Logo_ohne_Schrift.png";
import UcDashboard from "@/assets/uc_dashboard.png";
import UcDashboardHeat from "@/assets/uc_dashboard_heatmap.png";
import UcWetter from "@/assets/uc_wetter_ansicht.png";

/* ========================================================================
   App.tsx – Dark Theme + Google Sheets Submission (no-preflight)
   - Kontakt-Card zentriert & Hinweis unter dem Formular
   - Eigene Modal-Komponente (Impressum/Datenschutz) mit Schließen-Button
   - Newsletter-Checkbox sendet "yes"/"no"
   ======================================================================== */

/* ---------- Types ---------- */
interface SectionProps {
  id?: string;
  className?: string;
  children: ReactNode;
}

interface ContainerProps {
  className?: string;
  children: ReactNode;
}

interface HeatInfo {
  region: string;
  uhiDelta: string;
  heatIndex: string;
  tips: string[];
}

/* ---------- Config ---------- */
/** Apps Script Web-App Endpoint (neue Bereitstellung) */
const GAS_ENDPOINT =
  "https://script.google.com/macros/s/AKfycbx_9Qrj1hjdkcCpVz15FfX1k4x_wsoLqAh_Tm2tFlSk_mZclEd4UAu63hP1maHn1Iel/exec";

/* ---------- UI Helpers ---------- */
const Section: React.FC<SectionProps> = ({ id, className = "", children }) => (
  <section id={id} className={`py-16 md:py-24 ${className}`}>{children}</section>
);

const Container: React.FC<ContainerProps> = ({ className = "", children }) => (
  <div className={`mx-auto w-full px-4 sm:px-6 lg:px-8 ${className}`}>{children}</div>
);

/* ---------- Simple Modal (ohne externe Abhängigkeit) ---------- */
function useLockBody(open: boolean) {
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = original; };
  }, [open]);
}

function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  useLockBody(open);
  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center"
      aria-modal="true"
      role="dialog"
    >
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-[101] w-[92vw] max-w-3xl rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
        </div>
        <div className="text-slate-200">{children}</div>
        <div className="mt-6 flex justify-end">
          <Button
            onClick={onClose}
            className="bg-sky-500 hover:bg-sky-400 text-slate-950"
          >
            Schließen
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Mock heat info generator (client-side placeholder) ---------- */
function useHeatInfo(plz: string): HeatInfo | null {
  return useMemo(() => {
    if (!plz) return null;
    const seed = [...plz].reduce((a, c) => a + c.charCodeAt(0), 0);
    const delta = (seed % 30) / 10; // 0.0 – 2.9
    const uhi = 1 + (seed % 20) / 10; // 1.0 – 2.9°C
    return {
      region: `PLZ ${plz}`,
      uhiDelta: uhi.toFixed(1),
      heatIndex: (28 + delta).toFixed(1),
      tips: ["Schattenwege bevorzugen", "Regelmäßig trinken", "Mittags direkte Sonne meiden"],
    };
  }, [plz]);
}

export default function App() {
  const [plz, setPlz] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [consentHeat, setConsentHeat] = useState<boolean>(false);      // Heat-Info: Default NO
  const [consentContact, setConsentContact] = useState<boolean>(false); // Kontakt: Default NO
  const [newsletterOptIn, setNewsletterOptIn] = useState<boolean>(false); // optional
  const [notes, setNotes] = useState<string>("");                      // Sonstiges (Kontakt)
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [sending, setSending] = useState<boolean>(false);
  const [openImpressum, setOpenImpressum] = useState<boolean>(false);
  const [openDatenschutz, setOpenDatenschutz] = useState<boolean>(false);

  const heat = useHeatInfo(plz);

  /* ---------- Submit Heat-Info ---------- */
  async function handleHeatSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!/^[0-9]{4,5}$/.test(plz)) return alert("Bitte eine gültige PLZ angeben.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return alert("Bitte eine gültige E-Mail angeben.");
    if (!consentHeat) return alert("Bitte Einwilligung bestätigen.");

    try {
      setSending(true);

      const body = new URLSearchParams({
        plz,
        email,
        source: "heat-info",
        consent_heat: consentHeat ? "yes" : "no",
      });

      await fetch(GAS_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
        mode: "no-cors", // keine Antwort lesen → kein Fehler
      });

      setSubmitted(true);
    } catch (err) {
      console.error(err);
      alert("Netzwerkfehler – bitte erneut versuchen.");
    } finally {
      setSending(false);
    }
  }

  /* ---------- Submit Kontakt ---------- */
  async function handleContactSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!/^[0-9]{4,5}$/.test(plz)) return alert("Bitte eine gültige PLZ angeben.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return alert("Bitte eine gültige E-Mail angeben.");
    if (!consentContact) return alert("Bitte Einwilligung bestätigen.");

    try {
      setSending(true);

      const body = new URLSearchParams({
        plz,
        email,
        source: "contact-cta",
        newsletter: newsletterOptIn ? "yes" : "no", // <-- JA/NEIN für Newsletter
        consent_contact: consentContact ? "yes" : "no",
        sonstiges: notes ?? "",
      });

      await fetch(GAS_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
        mode: "no-cors",
      });

      setSubmitted(true);
    } catch (err) {
      console.error(err);
      alert("Netzwerkfehler – bitte erneut versuchen.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 text-slate-100">
      {/* NAV */}
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-900/80 backdrop-blur supports-[backdrop-filter]:bg-slate-900/70">
        <Container className="flex h-16 items-center justify-between">
          {/* Logo + Brand */}
          <a href="#hero" className="flex items-center gap-3">
            <img
              src={Logo}
              alt="Urban Cooler Logo"
              className="h-20 w-auto select-none"
              loading="eager"
              decoding="async"
            />
            <span className="text-lg font-semibold tracking-tight">Urban Cooler</span>
            <Badge className="ml-1" variant="secondary">Beta</Badge>
          </a>

          {/* Navigation (ohne Impressum/Datenschutz) */}
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <a className="hover:text-sky-400" href="#problem">Problem</a>
            <a className="hover:text-sky-400" href="#auswirkungen">Auswirkungen</a>
            <a className="hover:text-sky-400" href="#loesung">Lösung</a>
            <a className="hover:text-sky-400" href="#features">Hauptfunktionen</a>
            <a className="hover:text-sky-400" href="#case">Case Studies</a>
            <a className="hover:text-sky-400" href="#cta">Kontakt</a>
          </nav>

          {/* CTA */}
          <div className="flex items-center gap-3">
            <Button asChild size="sm" className="bg-sky-500 hover:bg-sky-400 text-slate-950">
              <a href="#cta">Jetzt informieren</a>
            </Button>
          </div>
        </Container>
      </header>

      {/* HERO */}
      <Section id="hero" className="pt-12 md:pt-24">
        <Container className="grid grid-cols-1 items-center gap-10 md:grid-cols-2">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="mb-4 inline-flex items-center rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-sm text-sky-400">
              Gemeinsam Städte abkühlen
            </span>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
              Urban Heat Islands sichtbar machen – und handeln
            </h1>
            <p className="mt-4 text-lg text-slate-300">
              Echtzeit-Hitzekarten, kühle Routen und priorisierte Maßnahmen für Kommunen – in einem
              Dashboard und einer kostenlosen App für Bürgerinnen und Bürger.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button asChild className="bg-sky-500 hover:bg-sky-400 text-slate-950">
                <a href="#cta" className="flex items-center gap-2">
                  <Navigation className="h-4 w-4" /> Jetzt Cool-Routes finden
                </a>
              </Button>
              <Button variant="outline" asChild className="border-slate-700 text-slate-100 hover:bg-slate-800">
                <a href="#features" className="flex items-center gap-2">
                  <Layers className="h-4 w-4" /> Features ansehen
                </a>
              </Button>
            </div>
            <div className="mt-6 flex items-center gap-6 text-sm text-slate-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" /> DSGVO-konform
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Kommunal & Bürger
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Open Data ready
              </div>
            </div>
          </motion.div>

          {/* Heat-Info Card */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}>
            <Card className="border border-slate-800 bg-slate-900/60 shadow-xl">
              <CardHeader className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-sky-300">
                  <MapPinned className="h-5 w-5" /> Heat-Info für deine Region
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleHeatSubmit} className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="plz">Postleitzahl</Label>
                    <Input id="plz" inputMode="numeric" placeholder="z. B. 1010" value={plz} onChange={(e) => setPlz(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">E-Mail</Label>
                    <Input id="email" type="email" placeholder="du@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>

                  <label className="flex items-start gap-3 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={consentHeat}
                      onChange={(e) => setConsentHeat(e.target.checked)}
                      className="mt-1"
                    />
                    <span>
                      Ich willige ein, dass meine Angaben zur Auswertung der Kampagne verwendet und in Google
                      Sheets gespeichert werden. Diese Einwilligung kann jederzeit widerrufen werden.
                    </span>
                  </label>

                  <Button disabled={sending} type="submit" className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950">
                    <Send className="h-4 w-4" /> {sending ? "Senden…" : "Heat-Info anzeigen"}
                  </Button>

                  {submitted && (
                    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 text-sm">
                      <div className="mb-2 flex items-center gap-2 font-medium text-slate-200">
                        <Info className="h-4 w-4 text-sky-300" /> Ergebnis
                      </div>
                      {heat ? (
                        <div className="space-y-1 text-slate-300">
                          <div><span className="font-semibold">Region:</span> {heat.region}</div>
                          <div><span className="font-semibold">UHI-Differenz:</span> +{heat.uhiDelta}°C</div>
                          <div><span className="font-semibold">Heat Index heute:</span> {heat.heatIndex}°C</div>
                          <div className="mt-2"><span className="font-semibold">Tipps:</span> {heat.tips.join(" • ")}</div>
                          <div className="mt-3 flex items-center gap-2 text-slate-400">
                            <Share2 className="h-4 w-4" /> Deine Gemeinde sieht, wie viele sich für Hitzeschutz interessieren.
                          </div>
                        </div>
                      ) : (
                        <div className="text-slate-300">Keine Daten verfügbar. Bitte PLZ prüfen.</div>
                      )}
                    </div>
                  )}
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </Container>
      </Section>

      {/* PROBLEM */}
      <Section id="problem" className="bg-slate-900">
        <Container>
          <h2 className="mb-8 text-3xl font-bold tracking-tight">Das Problem: Urbane Hitzeinseln</h2>
          <div className="grid gap-10 md:grid-cols-3">
            <Card className="border border-slate-800 bg-slate-900/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" /> Dichte Bebauung</CardTitle>
              </CardHeader>
              <CardContent className="text-slate-300">Gebäude, Straßen und Parkplätze speichern Wärme und geben sie nachts nur langsam ab.</CardContent>
            </Card>
            <Card className="border border-slate-800 bg-slate-900/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Flame className="h-5 w-5" /> Klimawandel</CardTitle>
              </CardHeader>
              <CardContent className="text-slate-300">Häufigere Hitzewellen verstärken die urbane Wärmebelastung und erhöhen Gesundheitsrisiken.</CardContent>
            </Card>
            <Card className="border border-slate-800 bg-slate-900/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Droplets className="h-5 w-5" /> Wenig Grün & Wasser</CardTitle>
              </CardHeader>
              <CardContent className="text-slate-300">Fehlende Vegetation reduziert Verdunstungskühlung und verschärft Hotspots.</CardContent>
            </Card>
          </div>
        </Container>
      </Section>

      {/* AUSWIRKUNGEN */}
      <Section id="auswirkungen" className="bg-slate-950">
        <Container>
          <h2 className="mb-8 text-3xl font-bold tracking-tight">Auswirkungen</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border border-slate-800 bg-slate-900/60 h-full">
              <CardHeader><CardTitle>Temperaturunterschied</CardTitle></CardHeader>
              <CardContent className="text-slate-300">Städtische Gebiete sind oft 1–3°C wärmer als ländliche Gegenden.</CardContent>
            </Card>
            <Card className="border border-slate-800 bg-slate-900/60 h-full">
              <CardHeader><CardTitle>Verstärkung durch Klimawandel</CardTitle></CardHeader>
              <CardContent className="text-slate-300">Häufigere Hitzewellen verstärken das UHI-Phänomen.</CardContent>
            </Card>
            <Card className="border border-slate-800 bg-slate-900/60 h-full">
              <CardHeader><CardTitle>Gesundheitsrisiken</CardTitle></CardHeader>
              <CardContent className="text-slate-300">Hitze-Stress und Kreislaufprobleme, besonders für gefährdete Gruppen.</CardContent>
            </Card>
            <Card className="border border-slate-800 bg-slate-900/60 h-full">
              <CardHeader><CardTitle>Infrastrukturprobleme</CardTitle></CardHeader>
              <CardContent className="text-slate-300">Erhöhte Kühlkosten, aufgewärmte Wasserleitungen und Netzbelastung.</CardContent>
            </Card>
          </div>
        </Container>
      </Section>

      {/* LÖSUNG */}
      <Section id="loesung" className="bg-slate-950">
        <Container className="grid items-center gap-10 md:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Die Lösung: Daten + Handlung</h2>
            <p className="mt-4 text-slate-300">
              Urban Cooler kombiniert Echtzeitdaten, Simulationen und Bürgerbeteiligung. Kommunen priorisieren Maßnahmen
              mit PRIO-Zonen, Bürgerinnen und Bürger nutzen kühle Routen und melden Spots.
            </p>
            <ul className="mt-6 space-y-3 text-slate-300">
              <li className="flex items-start gap-3"><CheckCircle2 className="mt-1 h-5 w-5 text-emerald-400" /> Heatmaps & Live-Daten</li>
              <li className="flex items-start gap-3"><CheckCircle2 className="mt-1 h-5 w-5 text-emerald-400" /> Cool-Routes & Trinkbrunnen</li>
              <li className="flex items-start gap-3"><CheckCircle2 className="mt-1 h-5 w-5 text-emerald-400" /> PRIO-Zonen & Simulationen</li>
            </ul>
            <div className="mt-6">
              <Button asChild className="bg-sky-500 hover:bg-sky-400 text-slate-950">
                <a href="#features" className="flex items-center gap-2">Mehr erfahren <ArrowRight className="h-4 w-4" /></a>
              </Button>
            </div>
          </div>
          <div>
            <div className="grid grid-cols-2 gap-4">
              <Card className="border border-slate-800 bg-slate-900/60">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sky-300"><ThermometerSun className="h-5 w-5" /> Heatmap</CardTitle>
                </CardHeader>
                <CardContent className="text-slate-300">Visualisiert Hotspots bis auf Quartiersebene und zeigt UHI-Differenzen.</CardContent>
              </Card>
              <Card className="border border-slate-800 bg-slate-900/60">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sky-300"><Navigation className="h-5 w-5" /> Cool-Routes</CardTitle>
                </CardHeader>
                <CardContent className="text-slate-300">Führt über schattige Wege mit Trinkwasser- und Ruhepunkten.</CardContent>
              </Card>
              <Card className="border border-slate-800 bg-slate-900/60">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sky-300"><Trees className="h-5 w-5" /> Maßnahmen</CardTitle>
                </CardHeader>
                <CardContent className="text-slate-300">Simuliert Begrünung, Entsiegelung und Materialwechsel.</CardContent>
              </Card>
              <Card className="border border-slate-800 bg-slate-900/60">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sky-300"><ShieldCheck className="h-5 w-5" /> Warnsystem</CardTitle>
                </CardHeader>
                <CardContent className="text-slate-300">Lokale Hitzewarnungen für vulnerable Gruppen und Pflegeeinrichtungen.</CardContent>
              </Card>
            </div>
          </div>
        </Container>
      </Section>

      {/* HAUPTFUNKTIONEN */}
      <Section id="features" className="bg-slate-900">
        <Container>
          <h2 className="text-3xl font-bold tracking-tight">Hauptfunktionen</h2>
        </Container>
        <Container>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            <Card className="border border-slate-800 bg-slate-900/60 overflow-hidden">
              <img src={UcDashboard} alt="Urban Cooler Dashboard" className="w-full h-auto border-b border-slate-800" loading="lazy" decoding="async" />
              <CardHeader><CardTitle className="flex items-center gap-2"><Layers className="h-5 w-5" /> Dashboard</CardTitle></CardHeader>
              <CardContent className="text-slate-300">PRIO-Zonen, KPIs und Berichte für Kommunen – alles auf einen Blick.</CardContent>
            </Card>
            <Card className="border border-slate-800 bg-slate-900/60 overflow-hidden">
              <img src={UcDashboardHeat} alt="Heatmap Ansicht" className="w-full h-auto border-b border-slate-800" loading="lazy" decoding="async" />
              <CardHeader><CardTitle className="flex items-center gap-2"><ThermometerSun className="h-5 w-5" /> Hitzekarten</CardTitle></CardHeader>
              <CardContent className="text-slate-300">UHI-Differenzen & Hotspots bis auf Quartiersebene visualisieren.</CardContent>
            </Card>
            <Card className="border border-slate-800 bg-slate-900/60 overflow-hidden">
              <img src={UcWetter} alt="Wettervorhersage" className="w-full h-auto border-b border-slate-800" loading="lazy" decoding="async" />
              <CardHeader><CardTitle className="flex items-center gap-2"><Droplets className="h-5 w-5" /> Wettervorhersagen</CardTitle></CardHeader>
              <CardContent className="text-slate-300">Lokale Vorhersagen und Hitzewarnungen zur besseren Planung.</CardContent>
            </Card>
          </div>
        </Container>
      </Section>

      {/* CASE STUDIES */}
      <Section id="case" className="bg-slate-950">
        <Container>
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-bold tracking-tight">Case Studies</h2>
            <Badge variant="secondary">Work in progress</Badge>
          </div>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <Card className="overflow-hidden border border-slate-800 bg-slate-900/60">
              <div className="h-48 w-full bg-gradient-to-tr from-emerald-900/30 to-sky-900/30" />
              <CardHeader><CardTitle>Umgestaltung Stadtpark</CardTitle></CardHeader>
              <CardContent className="text-slate-300">Reduktion der Oberflächentemperaturen durch Beschattung & Wasser.</CardContent>
            </Card>
            <Card className="overflow-hidden border border-slate-800 bg-slate-900/60">
              <div className="h-48 w-full bg-gradient-to-tr from-amber-900/30 to-rose-900/30" />
              <CardHeader><CardTitle>Reflektierende Dächer</CardTitle></CardHeader>
              <CardContent className="text-slate-300">Geringere Wärmeaufnahme und niedrigere Innenraumtemperaturen.</CardContent>
            </Card>
          </div>
        </Container>
      </Section>

      {/* CTA / KONTAKT – zentriert */}
      <Section id="cta" className="bg-slate-900">
        <Container className="max-w-3xl">
          <h2 className="mb-6 text-center text-3xl font-bold tracking-tight">Kontakt & Updates</h2>
          <Card className="mx-auto max-w-2xl border border-slate-800 bg-slate-900/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 justify-center"><Mail className="h-5 w-5" /> Updates & Pilotanfrage</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleContactSubmit} className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="plz-2">Postleitzahl</Label>
                  <Input id="plz-2" inputMode="numeric" placeholder="z. B. 6850" value={plz} onChange={(e) => setPlz(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email-2">E-Mail</Label>
                  <Input id="email-2" type="email" placeholder="du@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>

                <div className="grid gap-2">
                  <Label>Sonstiges (optional)</Label>
                  <Textarea
                    placeholder="Interessen, Fragen, Newsletter-Wünsche…"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                <label className="flex items-start gap-3 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={newsletterOptIn}
                    onChange={(e) => setNewsletterOptIn(e.target.checked)}
                    className="mt-1"
                  />
                  <span>Ich möchte den Newsletter und projektbezogene E-Mails erhalten (optional).</span>
                </label>

                <label className="flex items-start gap-3 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={consentContact}
                    onChange={(e) => setConsentContact(e.target.checked)}
                    className="mt-1"
                  />
                  <span>
                    Ich willige in die Verarbeitung meiner Angaben ein und die Speicherung in Google Sheets (Google Ireland Ltd.).
                    Diese Einwilligung kann jederzeit widerrufen werden. (*erforderlich)
                  </span>
                </label>

                <Button disabled={sending} type="submit" className="bg-emerald-500 hover:bg-emerald-400 text-slate-950">
                  {sending ? "Senden…" : "Interesse senden"}
                </Button>
              </form>

              {/* Hinweis unter dem Formular */}
              <div className="mt-4 text-sm text-slate-300">
                Mit dem Absenden stimmst du der Verarbeitung deiner Daten zur Bearbeitung deiner Anfrage zu. Details findest du im Datenschutz-Hinweis unten.
              </div>
            </CardContent>
          </Card>
        </Container>
      </Section>

      {/* FAQ */}
      <Section id="faq" className="bg-slate-950">
        <Container>
          <h2 className="text-3xl font-bold tracking-tight">Häufige Fragen</h2>
          <Accordion type="single" collapsible className="mt-6">
            <AccordionItem value="item-1">
              <AccordionTrigger>Wie funktioniert die UHI-Berechnung?</AccordionTrigger>
              <AccordionContent>
                Wir kombinieren offene Datenquellen mit lokalen Messungen. Die genaue Berechnung hängt vom verfügbaren Datenniveau deiner Kommune ab.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger>Ist die App kostenlos?</AccordionTrigger>
              <AccordionContent>
                Ja, die App für Bürgerinnen und Bürger ist kostenlos. Für Kommunen gibt es flexible Pakete für Dashboard und Datenintegration.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger>Wie werden Daten geschützt?</AccordionTrigger>
              <AccordionContent>
                Wir verarbeiten personenbezogene Daten nur mit Einwilligung und speichern sie minimiert und zweckgebunden gemäß DSGVO.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Container>
      </Section>

      {/* FOOTER mit funktionierenden Popups */}
      <footer className="border-t border-slate-800 bg-slate-900">
        <Container className="flex flex-col items-center justify-between gap-6 py-10 md:flex-row">
          <div className="flex items-center gap-3 text-sm text-slate-300">
            <ThermometerSun className="h-4 w-4" /> © {new Date().getFullYear()} Urban Cooler · Ein Innovationsprojekt der Fachhochschule Vorarlberg
          </div>

          <div className="flex items-center gap-6 text-sm">
            <button className="hover:text-sky-400" onClick={() => setOpenImpressum(true)}>Impressum</button>
            <button className="hover:text-sky-400" onClick={() => setOpenDatenschutz(true)}>Datenschutz</button>
            <a href="#cta" className="hover:text-sky-400">Kontakt</a>
          </div>
        </Container>

        {/* Impressum Modal */}
        <Modal open={openImpressum} onClose={() => setOpenImpressum(false)} title="Impressum">
          <div className="space-y-4 text-sm">
            <p><strong>Urban Cooler</strong> – Innovationsprojekt der Fachhochschule Vorarlberg</p>
            <p>
              FHV – Hochschule Vorarlberg GmbH<br />
              Hochschulstraße 1, 6850 Dornbirn, Österreich
            </p>
            <p>
              E-Mail: <a className="text-sky-400" href="mailto:info@fhv.at">info@fhv.at</a> · Web:{" "}
              <a className="text-sky-400" href="https://www.fhv.at" target="_blank" rel="noreferrer">www.fhv.at</a>
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p>Rechtsform: GmbH</p>
                <p>Firmensitz: Dornbirn, Österreich</p>
                <p>Firmenbuchnummer: <em>FN 165415h</em></p>
                <p>Firmenbuchgericht: <em>Feldkirch</em></p>
              </div>
            </div>
          </div>
        </Modal>

        {/* Datenschutz Modal */}
        <Modal open={openDatenschutz} onClose={() => setOpenDatenschutz(false)} title="Datenschutz (Kurzfassung)">
          <div className="space-y-4 text-sm">
            <p>
              Wir verarbeiten PLZ und E-Mail zur Auswertung des Interesses an Hitzeschutzmaßnahmen und zur Kontaktaufnahme,
              sofern gewünscht. Optional verarbeiten wir Angaben im Feld „Sonstiges“ sowie deine Newsletter-Einwilligung.
            </p>
            <p>
              Rechtsgrundlage: Einwilligung (Art. 6 Abs. 1 lit. a DSGVO). Widerruf jederzeit möglich.
            </p>
            <p>
              Speicherung: Google Spreadsheet (Google Ireland Ltd.). Speicherdauer: bis Widerruf oder Projektende.
              Betroffenenrechte: Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit.
            </p>
          </div>
        </Modal>
      </footer>
    </div>
  );
}
