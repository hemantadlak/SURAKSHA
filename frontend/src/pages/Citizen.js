import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Phone, Shield, ArrowLeft, Navigation } from "lucide-react";
import { api } from "@/lib/api";
import { useFetch } from "@/hooks/useFetch";
import { SurakshaMap } from "@/components/map/SurakshaMap";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmt, TONE_HEX, RISK_TONE } from "@/lib/format";

const T = {
  en: { title: "Citizen Safety View", where: "Where are you?", risk: "Current risk", zone: "Current zone", nearest: "Nearest safe destination", capacity: "Available capacity", route: "Safe route", contacts: "Emergency contacts", instructions: "What to do now", distance: "distance", people: "places", lang: "Language", disclaimer: "Prototype information. Always follow instructions from your district administration and local volunteers.", boat: "first stretch by boat / track", risk_levels: { "RED ZONE": "RED ZONE - very high risk", "HIGH RISK": "HIGH RISK", WATCH: "WATCH", SAFER: "SAFER" }, back: "Command center", noroute: "Route information not available - contact the district helpline." },
  as: { title: "নাগৰিক সুৰক্ষা দৃশ্য", where: "আপুনি ক'ত আছে?", risk: "বৰ্তমান বিপদাশংকা", zone: "বৰ্তমান অঞ্চল", nearest: "নিকটতম সুৰক্ষিত স্থান", capacity: "উপলব্ধ ঠাই", route: "সুৰক্ষিত পথ", contacts: "জৰুৰীকালীন যোগাযোগ", instructions: "এতিয়া কি কৰিব", distance: "দূৰত্ব", people: "ঠাই", lang: "ভাষা", disclaimer: "প্ৰোটোটাইপ তথ্য। সদায় জিলা প্ৰশাসন আৰু স্থানীয় স্বেচ্ছাসেবকৰ নিৰ্দেশনা মানি চলক।", boat: "প্ৰথম অংশ নাওৰে / পথেৰে", risk_levels: { "RED ZONE": "ৰঙা অঞ্চল - অতি উচ্চ বিপদ", "HIGH RISK": "উচ্চ বিপদ", WATCH: "সাবধান", SAFER: "সুৰক্ষিত" }, back: "কমান্ড চেন্টাৰ", noroute: "পথৰ তথ্য উপলব্ধ নহয় - জিলা সহায় লাইনত যোগাযোগ কৰক।" },
  hi: { title: "नीबेश सुरक्षा दृश्य", where: "आप कहाँ हैं?", risk: "वर्तमान जोखिम", zone: "वर्तमान क्षेत्र", nearest: "निकटतम सुरक्षित स्थान", capacity: "उपलब्ध क्षमता", route: "सुरक्षित मार्ग", contacts: "आपतकालीन संपर्क", instructions: "अभी क्या करें", distance: "दूरी", people: "स्थान", lang: "भाषा", disclaimer: "प्रोटोटाइप जानकारी। हमेशा जिला प्रशासन और स्थानीय स्वयंसेवकों के निर्देशों का पालन करें।", boat: "पहला हिस्सा नाव / कच्चे रास्ते से", risk_levels: { "RED ZONE": "रेड ज़ोन - अत्यधिक जोखिम", "HIGH RISK": "उच्च जोखिम", WATCH: "सतर्क", SAFER: "सुरक्षित" }, back: "कमांड सेंटर", noroute: "मार्ग की जानकारी उपलब्ध नहीं - जिला हेल्पलाइन से संपर्क करें।" },
};

const INSTR = {
  as: ["নথি-পত্ৰ, ঔষধ আৰু খোওাপানী জলৰোধী মোনাত রাখক", "শিশু, বয়স্ক আৰু ভিন্নক্ষম লোকক প্ৰথমে স্থানান্তৰ কৰক", "বৈ থকা পানী পাৰ হবলৈ চেষ্টা নকৰিব; নাও বা চৰকাৰী যানৰ বাবে অপেক্ষা কৰক", "ঘৰ এৰাৰ আগতে বিদ্যুৎ মেইন বন্ধ কৰক", "জিলা প্ৰশাসন আৰু গাঁৰ স্বেচ্ছাসেবকৰ নিৰ্দেশনা মানি চলক"],
  hi: ["दस्तावेज़, दवाइयाँ और पीने का पानी वाटरप्रूफ बैग में रखें", "बच्चों, बुजुर्गों और दिव्यांगजनों को पहले निकालें", "बहते पानी को पार करने की कोशिश न करें; नाव या सरकारी वाहन की प्रतीक्षा करें", "घर छोड़ने से पहले बिजली का मेन स्विच बंद करें", "जिला प्रशासन और ग्राम स्वयंसेवक के निर्देशों का पालन करें"],
};

export default function Citizen() {
  const [lang, setLang] = useState("en");
  const [habId, setHabId] = useState("H-DRG-01");
  const habs = useFetch(() => api.habitations(), []);
  const meta = useFetch(() => api.meta(), []);
  const data = useFetch(() => api.citizen(habId), [habId]);
  const t = T[lang];
  const d = data.data;
  const tone = d ? RISK_TONE[d.habitation.risk_level] : "neutral";

  useEffect(() => {
    document.title = "SURAKSHA - Citizen Safety View";
  }, []);

  const instructions = lang === "en" ? d?.instructions || [] : d?.habitation.risk_level === "RED ZONE" ? INSTR[lang] : INSTR[lang].slice(0, 3);

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="flex items-center justify-between border-b border-white/15 px-4 py-3">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-[#3b8ff0]" />
          <div>
            <div className="text-sm font-semibold tracking-[0.14em]">SURAKSHA</div>
            <div className="text-xs text-white/60">{t.title}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-36">
            <Select value={lang} onValueChange={setLang}>
              <SelectTrigger className="h-10 border-white/20 bg-white/5 text-sm text-white" aria-label={t.lang} data-testid="citizen-view-language-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="as">অসমীয়া</SelectItem>
                <SelectItem value="hi">हिन्दी</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Link to="/command-center" className="hidden sm:flex items-center gap-1 rounded-md border border-white/20 px-3 py-2 text-xs text-white/80 hover:bg-white/10" data-testid="citizen-back-link">
            <ArrowLeft className="h-3.5 w-3.5" /> {t.back}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 p-4">
        <div className="rounded-lg border border-white/15 bg-white/5 p-4">
          <label className="text-sm text-white/70">{t.where}</label>
          <Select value={habId} onValueChange={setHabId}>
            <SelectTrigger className="mt-2 h-12 border-white/20 bg-black text-base text-white" data-testid="citizen-location-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(habs.data?.habitations || []).map((h) => (
                <SelectItem key={h.id} value={h.id} className="text-base">
                  {h.name} - {h.district}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {d && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border p-4" style={{ borderColor: TONE_HEX[tone], background: `${TONE_HEX[tone]}22` }} data-testid="citizen-current-risk">
                <div className="text-xs uppercase tracking-wider text-white/70">{t.risk}</div>
                <div className="mt-1 text-2xl font-semibold" style={{ color: TONE_HEX[tone] }}>
                  {t.risk_levels[d.habitation.risk_level]}
                </div>
                <div className="mt-1 font-mono text-sm text-white/70">{d.habitation.risk_score}/100</div>
              </div>
              <div className="rounded-lg border border-white/15 bg-white/5 p-4" data-testid="citizen-current-zone">
                <div className="text-xs uppercase tracking-wider text-white/70">{t.zone}</div>
                <div className="mt-1 text-xl font-semibold">{d.habitation.name}</div>
                <div className="text-sm text-white/70">{d.habitation.district}</div>
              </div>
            </div>

            {d.nearest_safe_site ? (
              <div className="rounded-lg border border-[#38a169] bg-[#38a169]/15 p-4" data-testid="citizen-view-nearest-safe-site-button">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-white/70">
                  <Navigation className="h-4 w-4 text-[#38a169]" /> {t.nearest}
                </div>
                <div className="mt-1 text-2xl font-semibold">{d.nearest_safe_site.name}</div>
                <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-white/60">{t.distance}</div>
                    <div className="font-mono text-lg">{d.route ? `${d.route.distance_km} km` : `${d.nearest_safe_site.distance_km} km`}</div>
                  </div>
                  <div>
                    <div className="text-white/60">{t.capacity}</div>
                    <div className="font-mono text-lg text-[#38a169]">
                      {fmt(d.nearest_safe_site.available_capacity)} {t.people}
                    </div>
                  </div>
                </div>
                <div className="mt-1 text-xs text-white/60">{d.nearest_safe_site.road_label}</div>
              </div>
            ) : (
              <div className="rounded-lg border border-white/15 p-4 text-sm">{t.noroute}</div>
            )}

            <div className="rounded-lg border border-white/15 bg-white/5 p-4" data-testid="citizen-route">
              <div className="text-xs uppercase tracking-wider text-white/70">{t.route}</div>
              {d.route ? (
                <>
                  <div className="mt-1 text-sm text-white/85">
                    {d.route.label} · {d.route.distance_km} km{d.route.duration_min ? ` · ~${d.route.duration_min} min` : ""}
                    {d.route.origin_access_km >= 0.5 ? ` · ${d.route.origin_access_km} km ${t.boat}` : ""}
                  </div>
                  <div className="mt-2 h-64 overflow-hidden rounded-md">
                    <SurakshaMap habitations={[d.habitation]} sites={[{ ...d.nearest_safe_site, status: d.nearest_safe_site.status }]} routes={[{ id: "r", geometry: d.route.geometry, selected: true, label: d.route.label, distance_km: d.route.distance_km, duration_min: d.route.duration_min, hazard: { exposure_pct: d.route.hazard_exposure_pct } }]} layers={{ districts: false, habitations: true, buffers: false, sites: true, routes: true, infrastructure: false, reports: false }} basemap="streets" bounds={[[d.habitation.lat, d.habitation.lon], [d.nearest_safe_site.lat, d.nearest_safe_site.lon]]} fitKey={habId} center={[d.habitation.lat, d.habitation.lon]} zoom={11} showDistrictLabels={false} />
                  </div>
                </>
              ) : (
                <div className="mt-1 text-sm text-white/70">{t.noroute}</div>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-white/15 bg-white/5 p-4" data-testid="citizen-contacts">
                <div className="text-xs uppercase tracking-wider text-white/70">{t.contacts}</div>
                <div className="mt-2 space-y-2">
                  {(meta.data?.emergency_contacts || []).map((c) => (
                    <a key={c.number} href={`tel:${c.number}`} className="flex h-12 items-center justify-between rounded-lg border border-white/20 bg-black px-3 text-base hover:bg-white/10" data-testid={`citizen-contact-${c.number}`}>
                      <span className="flex items-center gap-2 text-sm text-white/85">
                        <Phone className="h-4 w-4" /> {c.label}
                      </span>
                      <span className="font-mono text-lg font-semibold">{c.number}</span>
                    </a>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-white/15 bg-white/5 p-4" data-testid="citizen-instructions">
                <div className="text-xs uppercase tracking-wider text-white/70">{t.instructions}</div>
                <ol className="mt-2 space-y-2 text-base leading-snug">
                  {instructions.map((i, idx) => (
                    <li key={i} className="flex gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/15 font-mono text-xs">{idx + 1}</span>
                      {i}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </>
        )}
        {data.loading && !d && <div className="h-40 animate-pulse rounded-lg bg-white/5" />}
        <p className="text-xs text-white/50">{t.disclaimer}</p>
      </main>
    </div>
  );
}
