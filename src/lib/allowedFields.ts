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
  pageSections: ["pageId", "sectionName", "sectionHeader", "buttonLabels"],
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
  // Add this entry to the ALLOWED_FIELDS object:
componentLibrary: ["name", "display_name", "category", "description", "tsx_code", "css_code"],


  orders: ["status", "notes"],

  commerceSettings: ["chapa_public_key", "chapa_secret_key", "chapa_webhook_secret"],
    brandStats: ["label", "value", "order"],




} as const;
