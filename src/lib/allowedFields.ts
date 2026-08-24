export const ALLOWED_FIELDS = {
  brandIdentity: ["key", "label", "value"],
  brandMessage: ["key", "title", "description"],
  brandValues: ["icon", "title", "description"],
  aboutContentBlocks: ["key", "title", "content", "images"],
  contactInfo: ["key", "label", "value"],
  designerProfile: ["key", "label", "value"],
  navigation: ["label", "href", "order"],
  pages: ["name", "route"],
  pageSeo: ["route", "metaTitle", "metaDescription", "keywords", "socialImage"],
  pageSections: [
    "pageId", "sectionName", "sectionHeader", "buttonLabels",
    "canvasHeight", "templateName", "componentId", "componentConfig",
    "layoutOrder", "isVisible",
  ],
  // ── Page Builder ────────────────────────────────────────────────────────────
  sectionTemplates: [
    "name", "slug", "description",
    "tsx_code", "css_code",
    "field_schema",   // JSON string
    "data_source",
    "published",
  ],
  pageSectionInstances: [
    "page_id", "template_id",
    "layout_order", "is_visible",
    "field_values",  // JSON string
    "data_source",
  ],
  // ────────────────────────────────────────────────────────────────────────────
  collections: [
    "name", "slug", "description", "coverImage",
    "releaseYear", "createdAt", "status", "inStock", "featured",
  ],
  products: [
    "collectionId", "name", "slug", "description", "mainImage",
    "gallery", "colors", "sizes", "inStock", "featured", "sizeGuide",
  ],
  events: [
    "title", "slug", "intro", "content", "featuredImage", "gallery",
    "videoUrl", "categoryId", "type", "eventDate", "location",
    "organizer", "featured",
  ],
  upcomingEvents: [
    "title", "slug", "intro", "content", "featuredImage", "categoryId",
    "eventDate", "location", "organizer", "registrationUrl", "ctaText", "featured",
  ],
  customTables: ["name", "display_name"],
  mediaPlaceholders: ["url", "label"],
  orders: ["status", "notes"],
  commerceSettings: ["chapa_public_key", "chapa_secret_key", "chapa_webhook_secret"],
  brandStats: ["label", "value", "order"],
} as const;