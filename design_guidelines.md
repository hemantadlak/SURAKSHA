{
  "product": {
    "name": "SURAKSHA",
    "tagline": "From Hazard Intelligence to Safer Relocation.",
    "positioning": "Operational GIS decision-support for DDMA/SDMA control rooms (not a citizen weather app).",
    "brand_attributes": [
      "credible",
      "serious",
      "instrument-like",
      "cartographic",
      "information-dense but readable",
      "audit-friendly (timestamps, sources, DEMO labels)"
    ],
    "primary_success_actions": [
      "Identify RED-ZONE habitation",
      "Understand why risk is high (factors + hazard breakdown)",
      "Prioritize relocation (IMMEDIATE/SHORT/MEDIUM/MONITOR)",
      "Compare alternative sites (recommended/conditional/rejected)",
      "Validate carrying capacity (sufficient/deficit)",
      "Generate relocation plan + safe route + action plan output"
    ]
  },

  "visual_personality": {
    "style": "Command-and-control GIS dashboard (dark navy/charcoal shell + light/neutral data panels).",
    "do_not": [
      "No hero sections",
      "No AI brain/assistant graphics",
      "No excessive glassmorphism",
      "No glowing gradients",
      "No decorative elements that do not support the workflow",
      "No universal transitions (never transition: all)"
    ],
    "allowed_decor": [
      "Subtle topographic/contour + grid texture (CSS-only)",
      "Thin cartographic dividers",
      "Small status dots and chips",
      "Minimal entrance animations only where they improve scanning"
    ]
  },

  "typography": {
    "google_fonts": {
      "ui_sans": {
        "name": "IBM Plex Sans",
        "weights": [400, 500, 600],
        "usage": "All UI text, tables, navigation, headings. Reads ‘government/ops’ without feeling dated."
      },
      "mono": {
        "name": "IBM Plex Mono",
        "weights": [400, 500],
        "usage": "Coordinates, timestamps, sensor values, IDs, small numeric KPIs (tabular feel)."
      }
    },
    "import_snippet_index_html": "<link rel=\"preconnect\" href=\"https://fonts.googleapis.com\">\n<link rel=\"preconnect\" href=\"https://fonts.gstatic.com\" crossorigin>\n<link href=\"https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap\" rel=\"stylesheet\">",
    "tailwind_font_families": {
      "sans": "['IBM Plex Sans', 'ui-sans-serif', 'system-ui']",
      "mono": "['IBM Plex Mono', 'ui-monospace', 'SFMono-Regular']"
    },
    "text_size_hierarchy": {
      "h1": "text-4xl sm:text-5xl lg:text-6xl (entry screen only)",
      "h2": "text-base md:text-lg (section subheading; keep compact)",
      "body": "text-sm md:text-base (dense UI defaults to text-sm)",
      "small": "text-xs (labels, meta, DEMO tags)",
      "numeric": "font-mono tabular-nums tracking-tight"
    },
    "rules": [
      "Avoid oversized headings inside the app shell; prioritize scanability.",
      "Use font-mono ONLY for coordinates/timestamps/sensor values/IDs; never for paragraphs.",
      "Prefer sentence case labels; ALL CAPS only for short chips (e.g., RED ZONE)."
    ]
  },

  "color_system": {
    "mode": "dark shell + light panels",
    "notes": [
      "Strict semantics: red=critical hazard/RED ZONE, orange=high risk, yellow=watch, green=safer/lower risk, blue=neutral/government data.",
      "Avoid saturated gradients; if any gradient is used, keep it subtle and limited to decorative section backgrounds (<20% viewport).",
      "Panels may be light neutral to improve readability of dense tables."
    ],
    "design_tokens_css_variables": {
      "paste_into": "/app/frontend/src/index.css (replace :root and .dark tokens)",
      "tokens": "@layer base {\n  :root {\n    /* SURAKSHA uses dark shell by default */\n    --background: 220 26% 8%;          /* #0E1420 deep navy */\n    --foreground: 210 20% 96%;         /* near-white */\n\n    --card: 220 24% 10%;               /* #111A2A */\n    --card-foreground: 210 20% 96%;\n\n    --popover: 220 24% 10%;\n    --popover-foreground: 210 20% 96%;\n\n    --primary: 210 90% 56%;            /* signal blue */\n    --primary-foreground: 220 26% 8%;\n\n    --secondary: 220 18% 16%;          /* charcoal tier */\n    --secondary-foreground: 210 20% 96%;\n\n    --muted: 220 16% 14%;\n    --muted-foreground: 215 14% 72%;\n\n    --accent: 220 18% 16%;\n    --accent-foreground: 210 20% 96%;\n\n    --destructive: 0 72% 56%;\n    --destructive-foreground: 210 20% 96%;\n\n    --border: 220 14% 22%;\n    --input: 220 14% 22%;\n    --ring: 210 90% 56%;\n\n    --radius: 0.6rem;\n\n    /* Semantic status (UI) */\n    --status-critical: 0 72% 56%;      /* red */\n    --status-high: 24 92% 56%;         /* orange */\n    --status-watch: 46 92% 56%;        /* yellow */\n    --status-safe: 145 58% 45%;        /* green */\n    --status-neutral: 210 90% 56%;     /* blue */\n\n    /* Soft backgrounds for chips/panels on dark */\n    --status-critical-soft: 0 72% 56% / 0.14;\n    --status-high-soft: 24 92% 56% / 0.14;\n    --status-watch-soft: 46 92% 56% / 0.14;\n    --status-safe-soft: 145 58% 45% / 0.14;\n    --status-neutral-soft: 210 90% 56% / 0.14;\n\n    /* Light panel system (inside dark shell) */\n    --panel: 210 20% 98%;              /* near-white */\n    --panel-foreground: 220 26% 10%;\n    --panel-muted: 210 16% 94%;\n    --panel-border: 220 10% 86%;\n\n    /* Map layer colors (fill/stroke tuned for dark basemap) */\n    --map-redzone-fill: 0 72% 56% / 0.28;\n    --map-redzone-stroke: 0 72% 56% / 0.85;\n    --map-high-fill: 24 92% 56% / 0.22;\n    --map-high-stroke: 24 92% 56% / 0.8;\n    --map-watch-fill: 46 92% 56% / 0.18;\n    --map-watch-stroke: 46 92% 56% / 0.75;\n    --map-safe-fill: 145 58% 45% / 0.16;\n    --map-safe-stroke: 145 58% 45% / 0.7;\n    --map-neutral-stroke: 210 90% 56% / 0.75;\n\n    /* Charts */\n    --chart-1: 210 90% 56%;\n    --chart-2: 145 58% 45%;\n    --chart-3: 46 92% 56%;\n    --chart-4: 24 92% 56%;\n    --chart-5: 0 72% 56%;\n  }\n\n  /* Keep .dark defined for shadcn compatibility; SURAKSHA runs in dark by default */\n  .dark {\n    --background: 220 26% 8%;\n    --foreground: 210 20% 96%;\n    --card: 220 24% 10%;\n    --card-foreground: 210 20% 96%;\n    --popover: 220 24% 10%;\n    --popover-foreground: 210 20% 96%;\n    --primary: 210 90% 56%;\n    --primary-foreground: 220 26% 8%;\n    --secondary: 220 18% 16%;\n    --secondary-foreground: 210 20% 96%;\n    --muted: 220 16% 14%;\n    --muted-foreground: 215 14% 72%;\n    --accent: 220 18% 16%;\n    --accent-foreground: 210 20% 96%;\n    --destructive: 0 72% 56%;\n    --destructive-foreground: 210 20% 96%;\n    --border: 220 14% 22%;\n    --input: 220 14% 22%;\n    --ring: 210 90% 56%;\n  }\n}\n"
    },
    "tailwind_extension_recommendation": {
      "paste_into": "tailwind.config.js (extend)",
      "extend": {
        "fontFamily": {
          "sans": "var(--font-sans)",
          "mono": "var(--font-mono)"
        },
        "boxShadow": {
          "panel": "0 1px 0 rgba(255,255,255,0.04), 0 12px 30px rgba(0,0,0,0.35)",
          "kpi": "0 1px 0 rgba(255,255,255,0.05), inset 0 0 0 1px rgba(255,255,255,0.06)"
        }
      },
      "note": "If the project already uses shadcn's token-based colors, prefer using CSS variables + Tailwind 'bg-background text-foreground border-border' patterns rather than hard-coded hex."
    },
    "status_color_semantics": {
      "critical": "RED ZONE / CRITICAL",
      "high": "HIGH RISK",
      "watch": "WATCH",
      "safe": "SAFER / LOWER RISK",
      "neutral": "GOVERNMENT / NEUTRAL DATA"
    }
  },

  "layout_and_grid": {
    "app_shell": {
      "pattern": "Left sidebar + top status bar + central map canvas + right intelligence panel",
      "recommended_dimensions": {
        "sidebar_width": "w-[264px] (collapsed: w-[72px])",
        "topbar_height": "h-14",
        "right_panel_width": "w-[420px] (can be resizable later)",
        "kpi_strip_height": "h-[92px] (wrap on small screens)"
      },
      "map_centerpiece": [
        "Map must always have explicit height: 'h-[calc(100vh-56px-92px)]' on desktop command center.",
        "On mobile: map becomes first-class; right panel becomes a Sheet/Drawer."
      ]
    },
    "responsive_rules": [
      "Mobile-first: stack KPI strip (horizontal scroll) + map + bottom sheet for intelligence.",
      "Use ScrollArea for dense right panel sections; keep map visible.",
      "Tables: allow horizontal scroll on <md; never shrink text below text-xs."
    ],
    "spacing_density": {
      "default_gap": "gap-3",
      "panel_padding": "p-3 (dense) / p-4 (comfortable)",
      "table_cell_padding": "py-2 px-2.5 (dense), headers py-2",
      "section_dividers": "Separator with opacity-60"
    }
  },

  "components": {
    "component_path": {
      "shadcn": "/app/frontend/src/components/ui/",
      "primary_components_to_use": [
        "button.jsx",
        "badge.jsx",
        "card.jsx",
        "table.jsx",
        "tabs.jsx",
        "select.jsx",
        "slider.jsx",
        "switch.jsx",
        "dialog.jsx",
        "sheet.jsx",
        "scroll-area.jsx",
        "tooltip.jsx",
        "separator.jsx",
        "progress.jsx",
        "calendar.jsx",
        "sonner.jsx"
      ]
    },

    "navigation": {
      "left_sidebar": {
        "structure": [
          "Wordmark + incident selector (optional)",
          "Primary nav items",
          "Relocation Workflow group (collapsible)",
          "Footer: Citizen View link + settings/help"
        ],
        "tailwind_classes": {
          "container": "bg-background text-foreground border-r border-border/70",
          "nav_item": "flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-foreground/80 hover:text-foreground hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "nav_item_active": "bg-white/8 text-foreground shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]"
        },
        "icons": "lucide-react only (no emoji).",
        "data_testids": [
          "sidebar-nav-command-center",
          "sidebar-nav-hazard-intelligence",
          "sidebar-nav-red-zones",
          "sidebar-nav-vulnerable-habitations",
          "sidebar-nav-relocation-priority",
          "sidebar-nav-alerts",
          "sidebar-nav-field-reports",
          "sidebar-nav-citizen-view"
        ]
      },
      "top_status_bar": {
        "contents": [
          "SURAKSHA wordmark",
          "Current incident (district + hazard profile)",
          "Data timestamp (font-mono)",
          "System status dot + label",
          "Prototype/DEMO label"
        ],
        "tailwind_classes": {
          "bar": "h-14 flex items-center justify-between px-4 border-b border-border/70 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80",
          "meta": "text-xs text-foreground/70",
          "mono": "font-mono tabular-nums text-xs text-foreground/80"
        },
        "system_status_dot": {
          "ok": "bg-[hsl(var(--status-safe))]",
          "degraded": "bg-[hsl(var(--status-watch))]",
          "down": "bg-[hsl(var(--status-critical))]"
        },
        "data_testids": [
          "topbar-current-incident",
          "topbar-data-timestamp",
          "topbar-system-status",
          "topbar-prototype-label"
        ]
      }
    },

    "kpi_strip": {
      "pattern": "6 KPI tiles, compact, numeric emphasis, quick scan.",
      "tile": {
        "layout": "label + big number + delta/meta",
        "classes": "rounded-lg bg-white/4 border border-border/70 px-3 py-2.5 shadow-kpi",
        "label": "text-xs text-foreground/70",
        "value": "text-xl font-semibold tracking-tight font-mono tabular-nums",
        "meta": "text-xs text-foreground/60"
      },
      "status_accent_rule": "Only use a 2px left border or small dot in semantic color; do not flood tile backgrounds with color.",
      "data_testids": [
        "kpi-critical-red-zones",
        "kpi-high-risk-habitations",
        "kpi-population-at-risk",
        "kpi-relocation-immediate",
        "kpi-available-safe-capacity",
        "kpi-capacity-deficit"
      ]
    },

    "status_chips_and_badges": {
      "use": "Badge (shadcn) with variants mapped to semantics.",
      "chip_classes": {
        "base": "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium tracking-wide",
        "critical": "bg-[hsl(var(--status-critical-soft))] text-[hsl(var(--status-critical))] ring-1 ring-inset ring-[hsl(var(--status-critical)/0.35)]",
        "high": "bg-[hsl(var(--status-high-soft))] text-[hsl(var(--status-high))] ring-1 ring-inset ring-[hsl(var(--status-high)/0.35)]",
        "watch": "bg-[hsl(var(--status-watch-soft))] text-[hsl(var(--status-watch))] ring-1 ring-inset ring-[hsl(var(--status-watch)/0.35)]",
        "safe": "bg-[hsl(var(--status-safe-soft))] text-[hsl(var(--status-safe))] ring-1 ring-inset ring-[hsl(var(--status-safe)/0.35)]",
        "neutral": "bg-[hsl(var(--status-neutral-soft))] text-[hsl(var(--status-neutral))] ring-1 ring-inset ring-[hsl(var(--status-neutral)/0.35)]"
      },
      "chip_sets": {
        "risk": ["RED ZONE", "HIGH RISK", "WATCH", "SAFER"],
        "priority": ["IMMEDIATE", "SHORT-TERM", "MEDIUM-TERM", "MONITOR"],
        "site_verdict": ["RECOMMENDED", "CONDITIONAL", "REJECTED"],
        "alerts": ["CRITICAL", "HIGH", "WATCH", "INFORMATION"]
      },
      "demo_label": {
        "text": "DEMO",
        "classes": "ml-2 rounded border border-border/70 bg-white/5 px-1.5 py-0.5 text-[10px] text-foreground/70"
      },
      "data_testids": [
        "risk-score-badge",
        "relocation-priority-chip",
        "site-verdict-chip",
        "alert-severity-chip"
      ]
    },

    "intelligence_panel": {
      "right_panel": {
        "container": "h-full border-l border-border/70 bg-background",
        "header": "p-3 border-b border-border/70",
        "body": "p-3 space-y-3",
        "scroll": "ScrollArea className='h-[calc(100vh-56px-92px)]'"
      },
      "sections": [
        "Selected habitation summary (name, admin hierarchy, population)",
        "Risk score badge + DEMO label",
        "Why high risk (contribution bars)",
        "GIS input layers table (8 rows)",
        "Assess Relocation CTA"
      ],
      "contribution_bars": {
        "pattern": "Horizontal bars with semantic color by factor type; show % and label.",
        "bar_track": "h-2 rounded bg-white/8",
        "bar_fill": "h-2 rounded bg-[hsl(var(--status-high))]",
        "row": "grid grid-cols-[1fr_auto] items-center gap-3",
        "label": "text-xs text-foreground/80",
        "value": "text-xs font-mono tabular-nums text-foreground/70",
        "data_testids": ["risk-factor-bar"]
      }
    },

    "tables": {
      "dense_table_style": {
        "wrapper": "rounded-lg border border-border/70 bg-background",
        "thead": "bg-white/3",
        "th": "text-xs font-medium text-foreground/70 py-2 px-2.5",
        "td": "text-sm py-2 px-2.5 text-foreground/85",
        "row_hover": "hover:bg-white/4",
        "mono_cells": "font-mono tabular-nums text-xs text-foreground/75"
      },
      "ranked_table": {
        "left_sticky": "Optional: sticky first column for habitation name on wide tables.",
        "filters": "Use Tabs or ToggleGroup for quick filters; Select for district/hazard lens."
      },
      "data_testids": [
        "vulnerable-habitations-table",
        "alternative-sites-table",
        "alerts-table",
        "hazard-intelligence-district-table"
      ]
    },

    "relocation_workflow_stepper": {
      "component": "Tabs (shadcn) styled as a stepper",
      "steps": [
        "Priority",
        "Sites",
        "Capacity",
        "Plan",
        "Route",
        "Action Plan"
      ],
      "classes": {
        "container": "rounded-lg border border-border/70 bg-background",
        "tab_list": "grid grid-cols-6 gap-1 bg-white/3 p-1",
        "tab": "text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm",
        "content": "p-4"
      },
      "layout": "Two-column: left content + right sticky mini-map (Card) with height ~320-420px.",
      "data_testids": ["relocation-stepper"]
    },

    "carrying_capacity_visual": {
      "library": "recharts",
      "visual": "Stacked horizontal bar: occupied vs available vs required overlay marker.",
      "classes": {
        "panel": "rounded-lg border border-border/70 bg-background p-4",
        "verdict": "mt-2 text-sm",
        "verdict_ok": "text-[hsl(var(--status-safe))]",
        "verdict_deficit": "text-[hsl(var(--status-critical))]"
      },
      "data_testids": [
        "capacity-total",
        "capacity-available",
        "capacity-required",
        "capacity-verdict"
      ]
    },

    "action_plan_document": {
      "style": "Document-like panel inside dark shell (light panel surface).",
      "classes": {
        "container": "rounded-lg border border-[hsl(var(--panel-border))] bg-[hsl(var(--panel))] text-[hsl(var(--panel-foreground))] shadow-panel",
        "header": "border-b border-[hsl(var(--panel-border))] p-4",
        "body": "p-4 space-y-4",
        "h": "text-base font-semibold",
        "meta": "text-xs text-black/60 font-mono tabular-nums",
        "list": "list-disc pl-5 text-sm"
      },
      "disclaimer": "Always include: 'Decision-support output. Final authority rests with the responsible officer. Prototype/Illustrative data where marked.'",
      "data_testids": ["action-plan-output"]
    }
  },

  "map_gis_design": {
    "leaflet": {
      "must_do": [
        "Load Leaflet CSS globally.",
        "Map container must have explicit height.",
        "Override Leaflet control/popup styles to match dark shell."
      ],
      "basemap_switcher": {
        "ui": "Use a small Card/Popover anchored top-right of map; list basemaps with radio-like selection.",
        "basemaps": [
          "OSM Streets",
          "Terrain",
          "Esri Satellite (visual context only)",
          "Dark (preferred for ops)"
        ],
        "data_testids": ["map-basemap-switcher"]
      },
      "layer_controls": {
        "ui": "Use a Sheet on mobile; on desktop a compact Card with Switch toggles.",
        "layers": [
          "Composite Red Zones (choropleth)",
          "Per-hazard lens",
          "Habitation markers",
          "Relocation sites",
          "Infrastructure",
          "Evacuation routes",
          "Field reports"
        ],
        "data_testids": ["map-layer-toggle"]
      },
      "legend": {
        "ui": "Bottom-left legend Card with semantic swatches + labels + opacity note.",
        "classes": "rounded-lg border border-border/70 bg-background/92 backdrop-blur p-3 text-xs",
        "swatch": "h-2.5 w-2.5 rounded-sm ring-1 ring-white/10",
        "data_testids": ["map-legend"]
      },
      "marker_design": {
        "habitation_marker": {
          "type": "Leaflet divIcon",
          "shape": "rounded-md with small hazard badge corner",
          "classes": "shadow-[0_10px_20px_rgba(0,0,0,0.35)]",
          "color_rule": "Marker border uses semantic risk color; fill stays neutral to avoid map clutter."
        },
        "relocation_site_marker": {
          "shape": "circle with inner dot",
          "color": "status-safe or neutral-blue depending on verification"
        }
      },
      "popup_style_css": "/* Leaflet theme overrides (add to index.css) */\n.leaflet-container { background: #0b1220; }\n.leaflet-control { box-shadow: none; }\n.leaflet-bar a {\n  background: hsl(var(--card));\n  color: hsl(var(--foreground));\n  border-bottom: 1px solid hsl(var(--border));\n}\n.leaflet-bar a:hover { background: rgba(255,255,255,0.06); }\n.leaflet-control-zoom a { width: 34px; height: 34px; line-height: 34px; }\n.leaflet-popup-content-wrapper, .leaflet-popup-tip {\n  background: hsl(var(--card));\n  color: hsl(var(--foreground));\n  border: 1px solid hsl(var(--border));\n}\n.leaflet-popup-content { margin: 10px 12px; }\n.leaflet-tooltip {\n  background: rgba(17,26,42,0.92);\n  color: rgba(255,255,255,0.92);\n  border: 1px solid rgba(255,255,255,0.10);\n  border-radius: 8px;\n  padding: 6px 8px;\n}\n",
      "map_polygon_style_guidance": {
        "red_zone": "fillColor: 'hsl(var(--map-redzone-fill))', color: 'hsl(var(--map-redzone-stroke))', weight: 2",
        "high": "fillColor: 'hsl(var(--map-high-fill))', color: 'hsl(var(--map-high-stroke))'",
        "watch": "fillColor: 'hsl(var(--map-watch-fill))', color: 'hsl(var(--map-watch-stroke))'",
        "safe": "fillColor: 'hsl(var(--map-safe-fill))', color: 'hsl(var(--map-safe-stroke))'"
      }
    },
    "cartographic_texture_css": {
      "goal": "Subtle topo/grid texture on shell surfaces (NOT on reading-heavy panels).",
      "paste_into": "/app/frontend/src/index.css",
      "css": "/* Subtle topo/grid texture (CSS-only). Apply to app shell wrappers, not to tables/cards. */\n.suraksha-shell-texture {\n  background-color: hsl(var(--background));\n  background-image:\n    linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px),\n    linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px),\n    radial-gradient(circle at 20% 30%, rgba(255,255,255,0.06), transparent 55%),\n    radial-gradient(circle at 70% 60%, rgba(255,255,255,0.05), transparent 60%);\n  background-size: 48px 48px, 48px 48px, 900px 900px, 1100px 1100px;\n  background-position: 0 0, 0 0, 0 0, 0 0;\n}\n\n/* Optional: very subtle noise overlay */\n.suraksha-noise::before {\n  content: \"\";\n  position: absolute;\n  inset: 0;\n  pointer-events: none;\n  background-image: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)' opacity='.18'/%3E%3C/svg%3E\");\n  opacity: 0.06;\n  mix-blend-mode: overlay;\n}\n"
    }
  },

  "motion_and_microinteractions": {
    "principles": [
      "Minimal motion; prioritize clarity and performance.",
      "Use motion to confirm state changes (layer toggles, selection, acknowledge).",
      "Respect prefers-reduced-motion."
    ],
    "allowed_interactions": {
      "hover": [
        "Nav items: background tint + text brighten",
        "Table rows: subtle highlight",
        "Map legend/control cards: subtle elevation"
      ],
      "press": ["Buttons scale to 0.98 on active"],
      "selection": ["Selected habitation row gets left border in semantic color"],
      "loading": ["Skeleton for panels; progress bar for data fetch"],
      "toasts": ["Use Sonner for acknowledgements and save actions"]
    },
    "tailwind_snippets": {
      "interactive": "transition-colors duration-150",
      "press": "active:scale-[0.98] transition-transform duration-100",
      "focus": "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    }
  },

  "accessibility": {
    "requirements": [
      "WCAG AA contrast on dark surfaces.",
      "Visible focus states on all interactive elements.",
      "Do not encode meaning by color alone: pair chips with text labels and icons.",
      "Provide keyboard access for layer toggles, tables, dialogs, and citizen view controls."
    ],
    "map_accessibility": [
      "Provide a non-map list/table alternative for key selections (vulnerable habitations table).",
      "Popups should be readable and not require precise pointer interactions."
    ]
  },

  "testing_attributes": {
    "rule": "All interactive and key informational elements MUST include data-testid.",
    "naming_convention": "kebab-case describing role (not appearance).",
    "examples": [
      "data-testid='launch-command-center-button'",
      "data-testid='citizen-view-language-select'",
      "data-testid='map-layer-toggle-redzones'",
      "data-testid='habitation-intel-assess-relocation-button'",
      "data-testid='alerts-acknowledge-button'"
    ]
  },

  "pages": {
    "entry_screen": {
      "layout": "Minimal, centered vertically but content left-aligned within a narrow panel; no hero graphics.",
      "components": ["Card", "Button", "Badge"],
      "cta": {
        "primary": "Launch Command Center",
        "secondary": "Citizen Safety View"
      },
      "data_testids": ["launch-command-center-button", "launch-citizen-view-button"]
    },
    "command_center": {
      "layout": "KPI strip + map + right intelligence panel",
      "must_include": [
        "Legend",
        "Basemap switcher",
        "Layer toggles",
        "Selected habitation state reflected across map + table + panel"
      ]
    },
    "citizen_view": {
      "style": "High-contrast, simplified, large controls; fewer layers; clear disclaimers.",
      "controls": ["language selector", "nearest safe site", "route guidance", "alerts"],
      "classes": {
        "button": "h-12 text-base rounded-lg",
        "panel": "bg-black text-white border-white/15"
      },
      "data_testids": ["citizen-view-language-select", "citizen-view-nearest-safe-site-button"]
    }
  },

  "image_urls": {
    "note": "This product should avoid decorative imagery. Use icons + map. No government seals/logos. No stock hero photos required.",
    "categories": [
      {
        "category": "entry_screen_background",
        "description": "No external image. Use CSS topo/grid texture only.",
        "urls": []
      },
      {
        "category": "empty_states",
        "description": "Optional: Lottie minimal line animations (offline-safe) — only if already available; otherwise use Skeleton + text.",
        "urls": []
      }
    ]
  },

  "libraries_and_integrations": {
    "recommended": [
      {
        "name": "recharts",
        "why": "Capacity stacked bars, contribution breakdowns, small sparklines in KPI tiles.",
        "usage_notes": "Keep charts minimal; use semantic colors; avoid gradients."
      },
      {
        "name": "framer-motion (optional)",
        "why": "Only for subtle panel transitions and sheet open/close; can be skipped for performance.",
        "install": "npm i framer-motion",
        "usage_notes": "Respect prefers-reduced-motion; do not animate map."
      }
    ]
  },

  "instructions_to_main_agent": [
    "Replace CRA default App.css centering styles; do NOT center the app container globally.",
    "Update /app/frontend/src/index.css tokens to SURAKSHA tokens above; ensure app runs in dark mode by default (apply className='dark' on root wrapper or set tokens in :root as provided).",
    "Implement app shell layout: left sidebar + top bar + KPI strip + map + right intelligence panel.",
    "Use shadcn components from /app/frontend/src/components/ui only for interactive UI (Select, Tabs, Sheet, Dialog, Tooltip, Table, Slider, Switch, Sonner).",
    "Every interactive element and key info must include data-testid (kebab-case).",
    "Leaflet: ensure map container has explicit height; apply provided Leaflet CSS overrides in index.css.",
    "Use monospace only for coordinates/timestamps/sensor values; keep body text in IBM Plex Sans.",
    "Any simulated values must show a small DEMO/Prototype label; never imply authority to order evacuation."
  ]
}


<General UI UX Design Guidelines>  
    - You must **not** apply universal transition. Eg: `transition: all`. This results in breaking transforms. Always add transitions for specific interactive elements like button, input excluding transforms
    - You must **not** center align the app container, ie do not add `.App { text-align: center; }` in the css file. This disrupts the human natural reading flow of text
   - NEVER: use AI assistant Emoji characters like`🤖🧠💭💡🔮🎯📚🎭🎬🎪🎉🎊🎁🎀🎂🍰🎈🎨🎰💰💵💳🏦💎🪙💸🤑📊📈📉💹🔢🏆🥇 etc for icons. Always use **FontAwesome cdn** or **lucid-react** library already installed in the package.json

 **GRADIENT RESTRICTION RULE**
NEVER use dark/saturated gradient combos (e.g., purple/pink) on any UI element.  Prohibited gradients: blue-500 to purple 600, purple 500 to pink-500, green-500 to blue-500, red to pink etc
NEVER use dark gradients for logo, testimonial, footer etc
NEVER let gradients cover more than 20% of the viewport.
NEVER apply gradients to text-heavy content or reading areas.
NEVER use gradients on small UI elements (<100px width).
NEVER stack multiple gradient layers in the same viewport.

**ENFORCEMENT RULE:**
    • Id gradient area exceeds 20% of viewport OR affects readability, **THEN** use solid colors

**How and where to use:**
   • Section backgrounds (not content backgrounds)
   • Hero section header content. Eg: dark to light to dark color
   • Decorative overlays and accent elements only
   • Hero section with 2-3 mild color
   • Gradients creation can be done for any angle say horizontal, vertical or diagonal

- For AI chat, voice application, **do not use purple color. Use color like light green, ocean blue, peach orange etc**

</Font Guidelines>

- Every interaction needs micro-animations - hover states, transitions, parallax effects, and entrance animations. Static = dead. 
   
- Use 2-3x more spacing than feels comfortable. Cramped designs look cheap.

- Subtle grain textures, noise overlays, custom cursors, selection states, and loading animations: separates good from extraordinary.
   
- Before generating UI, infer the visual style from the problem statement (palette, contrast, mood, motion) and immediately instantiate it by setting global design tokens (primary, secondary/accent, background, foreground, ring, state colors), rather than relying on any library defaults. Don't make the background dark as a default step, always understand problem first and define colors accordingly
    Eg: - if it implies playful/energetic, choose a colorful scheme
           - if it implies monochrome/minimal, choose a black–white/neutral scheme

**Component Reuse:**
	- Prioritize using pre-existing components from src/components/ui when applicable
	- Create new components that match the style and conventions of existing components when needed
	- Examine existing components to understand the project's component patterns before creating new ones

**IMPORTANT**: Do not use HTML based component like dropdown, calendar, toast etc. You **MUST** always use `/app/frontend/src/components/ui/ ` only as a primary components as these are modern and stylish component

**Best Practices:**
	- Use Shadcn/UI as the primary component library for consistency and accessibility
	- Import path: ./components/[component-name]

**Export Conventions:**
	- Components MUST use named exports (export const ComponentName = ...)
	- Pages MUST use default exports (export default function PageName() {...})

**Toasts:**
  - Use `sonner` for toasts"
  - Sonner component are located in `/app/src/components/ui/sonner.tsx`

Use 2–4 color gradients, subtle textures/noise overlays, or CSS-based noise to avoid flat visuals.
</General UI UX Design Guidelines>
