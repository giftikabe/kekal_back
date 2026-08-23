/**
 * Field whitelist per entity, used with pickFields() in every admin CRUD
 * route. Keep this in sync with the drizzle schema (minus `id`, and minus
 * any server-managed columns like passwordHash/createdAt where relevant).
 */
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
    "pageId",
    "sectionName",
    "sectionHeader",
    "buttonLabels",
    "canvasHeight",
    "templateName",
    // Page Builder fields
    "componentId",
    "componentConfig",
    "layoutOrder",
    "isVisible",
  ],
  collections: [
    "name",
    "slug",
    "description",
    "coverImage",
    "releaseYear",
    "createdAt",
    "status",
    "inStock",
    "featured",
  ],
  products: [
    "collectionId",
    "name",
    "slug",
    "description",
    "mainImage",
    "gallery",
    "colors",
    "sizes",
    "inStock",
    "featured",
    "sizeGuide",
  ],
  events: [
    "title",
    "slug",
    "intro",
    "content",
    "featuredImage",
    "gallery",
    "videoUrl",
    "categoryId",
    "type",
    "eventDate",
    "location",
    "organizer",
    "featured",
  ],
  upcomingEvents: [
    "title",
    "slug",
    "intro",
    "content",
    "featuredImage",
    "categoryId",
    "eventDate",
    "location",
    "organizer",
    "registrationUrl",
    "ctaText",
    "featured",
  ],
  customTables: ["name", "display_name"],
  // NOTE: tsx_code / css_code intentionally removed — code is never
  // written to the DB anymore. See componentLibrary.ts route: /publish
  // takes code directly in the request body and commits it straight to
  // GitHub without ever calling pickFields/insert with it.

  mediaPlaceholders: ["url", "label"],
  orders: ["status", "notes"],
  commerceSettings: ["chapa_public_key", "chapa_secret_key", "chapa_webhook_secret"],
  brandStats: ["label", "value", "order"],
} as const;