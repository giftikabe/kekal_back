/**
 * Registers your EXISTING frontend components as componentLibrary rows so
 * they're immediately reusable in the Page Builder canvas, without
 * touching their code (they already live in src/kekal/components/*.tsx —
 * githubPath just points at what's already there).
 *
 * propSchema below was derived directly from each component's actual props
 * interface in the files you shared. It's a starting point, not
 * exhaustive — I only covered the general-purpose "section" style
 * components (the ones most likely to get reused/repositioned across
 * pages) rather than every single file, and skipped ones that are tightly
 * bound to route params (e.g. ProductBody, EventContent) or are more
 * "whole page fragments" than draggable building blocks. Add more rows
 * the same way as needed.
 *
 * Usage:
 *   DATABASE_URL=... npx tsx src/scripts/seedCoreComponents.ts
 */
import postgres from "postgres";
import { randomUUID } from "crypto";

type PropType = "text" | "richtext" | "image" | "video" | "url" | "number" | "boolean" | "list";

interface PropDef {
  name: string;
  label: string;
  type: PropType;
  bindable: boolean;
  placeholder: unknown;
}

interface CoreComponentSeed {
  name: string;
  displayName: string;
  category: string;
  description: string;
  propSchema: PropDef[];
}

const CORE_COMPONENTS: CoreComponentSeed[] = [
  {
    name: "Hero",
    displayName: "Hero",
    category: "hero",
    description: "Full-bleed image hero with tagline, description and two CTA buttons.",
    propSchema: [
      { name: "tagline", label: "Tagline", type: "text", bindable: true, placeholder: "Handcrafted Ethiopian Fashion" },
      { name: "description", label: "Description", type: "richtext", bindable: true, placeholder: "A short description of the brand goes here." },
      { name: "image", label: "Background Image", type: "image", bindable: true, placeholder: null },
    ],
  },
  {
    name: "FeaturedCollections",
    displayName: "Featured Collections",
    category: "section",
    description: "Horizontal scroll of featured collection cards.",
    propSchema: [
      { name: "title", label: "Section Title", type: "text", bindable: true, placeholder: "Featured Collections" },
    ],
  },
  {
    name: "DesignerSection",
    displayName: "Designer Section",
    category: "section",
    description: "Designer portrait + short bio with a link to the About page.",
    propSchema: [
      { name: "title", label: "Section Title", type: "text", bindable: true, placeholder: "Meet The Designer" },
      { name: "ctaText", label: "CTA Text", type: "text", bindable: false, placeholder: "Read More →" },
    ],
  },
  {
    name: "CommunityEventsSection",
    displayName: "Community Events Section",
    category: "section",
    description: "Grid of event cards.",
    propSchema: [
      { name: "title", label: "Section Title", type: "text", bindable: true, placeholder: "Community & Events" },
    ],
  },
  {
    name: "UpcomingEvents",
    displayName: "Upcoming Events Banner",
    category: "section",
    description: "Rotating banner of upcoming events with dots navigation.",
    propSchema: [
      { name: "title", label: "Section Title", type: "text", bindable: true, placeholder: "Upcoming Event" },
    ],
  },
  {
    name: "HomeValueCards",
    displayName: "Value Cards",
    category: "section",
    description: "Row of icon + title + description trust badges.",
    propSchema: [],
  },
  {
    name: "StatsBar",
    displayName: "Stats Bar",
    category: "stats",
    description: "Row of number + label stats.",
    propSchema: [],
  },
  {
    name: "QuoteSection",
    displayName: "Quote Section",
    category: "section",
    description: "Large centered pull-quote with an attributed author.",
    propSchema: [
      { name: "quote", label: "Quote", type: "richtext", bindable: true, placeholder: "A short inspiring quote." },
      { name: "author", label: "Author", type: "text", bindable: true, placeholder: "Jane Doe" },
    ],
  },
  {
    name: "ContactCTASection",
    displayName: "Contact CTA",
    category: "section",
    description: "Centered heading + description + button linking to /contact.",
    propSchema: [
      { name: "title", label: "Title", type: "text", bindable: true, placeholder: "Let's Create Together" },
      { name: "description", label: "Description", type: "richtext", bindable: true, placeholder: "Reach out — we'd love to hear from you." },
      { name: "buttonText", label: "Button Text", type: "text", bindable: false, placeholder: "Contact" },
    ],
  },
  {
    name: "CollectionHero",
    displayName: "Collection Hero",
    category: "hero",
    description: "Collection cover image with overlay title and release year.",
    propSchema: [], // takes a `collection` object — bind at the section level once nested-object binding exists
  },
  {
    name: "EventCard",
    displayName: "Event Card",
    category: "card",
    description: "Single event card: image, title, date.",
    propSchema: [],
  },
  {
    name: "ProductCard",
    displayName: "Product Card",
    category: "card",
    description: "Single product card: image, name, stock badge.",
    propSchema: [],
  },
  {
    name: "SitotaGiftCards",
    displayName: "Gift Cards Grid",
    category: "section",
    description: "3-card grid promoting gift occasions.",
    propSchema: [],
  },
];

async function main() {
  const sql = postgres(process.env.DATABASE_URL!);
  const now = new Date().toISOString();

  for (const comp of CORE_COMPONENTS) {
    const existing = await sql`select id from component_library where name = ${comp.name}`;
    if (existing.length > 0) {
      console.log(`Skipping ${comp.name} — already registered.`);
      continue;
    }

    await sql`
      insert into component_library
        (id, name, display_name, category, description, github_path, css_github_path, prop_schema, status, is_core, created_at, updated_at)
      values (
        ${randomUUID()}, ${comp.name}, ${comp.displayName}, ${comp.category}, ${comp.description},
        ${`src/kekal/components/${comp.name}.tsx`},
        ${`src/kekal/components/${comp.name}.module.css`},
        ${JSON.stringify(comp.propSchema)}::jsonb,
        'published', true, ${now}, ${now}
      )
    `;
    console.log(`Registered ${comp.name}.`);
  }

  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
