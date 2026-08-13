import { Hono } from "hono";
import { eq, isNotNull } from "drizzle-orm";
import { createDb } from "../../db/index";
import { pageSections } from "../../db/schema/pageSections";
import { pageSectionComponents } from "../../db/schema/pageSectionComponents";
import { pages } from "../../db/schema/pages";
import { componentLibrary } from "../../db/schema/componentLibrary";
import { collections } from "../../db/schema/collections";
import { products } from "../../db/schema/products";
import { events } from "../../db/schema/events";
import { upcomingEvents } from "../../db/schema/upcomingEvents";
import { authMiddleware, requirePermission } from "../../middleware/auth";
import { commitFileToFrontend } from "../../lib/github";
import { resolveDataBindings, generateSectionJSX, type ComponentInstanceForCodegen } from "../../lib/codegen";

type Bindings = {
  DATABASE_URL: string;
  JWT_SECRET: string;
  SUPER_ADMIN_EMAIL: string;
  GITHUB_TOKEN: string;
  GITHUB_OWNER: string;
  GITHUB_REPO_FRONTEND: string;
  GITHUB_BRANCH: string;
};
type Variables = {
  userId: string;
  email: string;
  isSuperAdmin: boolean;
  permissions: string[];
};

export const adminPageBuilderRouter = new Hono<{
  Bindings: Bindings;
  Variables: Variables;
}>();

function toPageComponentName(name: string): string {
  return (
    name
      .split(/\s+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join("") + "Page"
  );
}

async function loadSectionWithInstances(db: any, section: any) {
  const instances = await db
    .select({
      id: pageSectionComponents.id,
      componentId: pageSectionComponents.componentId,
      x: pageSectionComponents.x,
      y: pageSectionComponents.y,
      width: pageSectionComponents.width,
      height: pageSectionComponents.height,
      zIndex: pageSectionComponents.zIndex,
      propsOverride: pageSectionComponents.propsOverride,
      dataBindings: pageSectionComponents.dataBindings,
      componentName: componentLibrary.name,
      componentDisplayName: componentLibrary.displayName,
      componentStatus: componentLibrary.status,
    })
    .from(pageSectionComponents)
    .leftJoin(componentLibrary, eq(pageSectionComponents.componentId, componentLibrary.id))
    .where(eq(pageSectionComponents.sectionId, section.id));

  return { ...section, instances };
}

// GET /pages — all pages with their ordered sections + each section's instances
adminPageBuilderRouter.get("/pages", authMiddleware, requirePermission("pages", "read"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const allPages = await db.select().from(pages);
  const allSections = await db.select().from(pageSections).orderBy(pageSections.layoutOrder);

  const sectionsWithInstances = await Promise.all(
    allSections.map((s: any) => loadSectionWithInstances(db, s))
  );

  const result = allPages.map((page: any) => ({
    ...page,
    sections: sectionsWithInstances.filter((s: any) => s.pageId === page.id),
  }));

  return c.json(result);
});

// GET /pages/:pageId — single page with ordered sections + instances
adminPageBuilderRouter.get("/pages/:pageId", authMiddleware, requirePermission("pages", "read"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const { pageId } = c.req.param();

  const pageResult = await db.select().from(pages).where(eq(pages.id, pageId));
  if (!pageResult[0]) return c.json({ error: "Not found" }, 404);

  const sections = await db
    .select()
    .from(pageSections)
    .where(eq(pageSections.pageId, pageId))
    .orderBy(pageSections.layoutOrder);

  const sectionsWithInstances = await Promise.all(
    sections.map((s: any) => loadSectionWithInstances(db, s))
  );

  return c.json({ ...pageResult[0], sections: sectionsWithInstances });
});

// POST /pages/:pageId/sections — add a blank section (canvas) to a page.
// No componentId anymore — a section is populated afterwards via the
// section-components endpoints (see sectionComponents.ts).
adminPageBuilderRouter.post("/pages/:pageId/sections", authMiddleware, requirePermission("pages", "create"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const { pageId } = c.req.param();
  const body = await c.req.json();

  const newSection = {
    id: crypto.randomUUID(),
    pageId,
    sectionName: body.section_name ?? null,
    sectionHeader: body.section_header ?? null,
    buttonLabels: body.button_labels ?? [],
    componentId: null,
    componentConfig: null,
    layoutOrder: body.layout_order ?? 0,
    isVisible: true,
    canvasHeight: body.canvas_height ?? 480,
    templateName: null,
    createdAt: new Date().toISOString(),
  } as typeof pageSections.$inferInsert;

  await db.insert(pageSections).values(newSection);
  return c.json(newSection, 201);
});

// PATCH /sections/:sectionId — update section-level settings
adminPageBuilderRouter.patch("/sections/:sectionId", authMiddleware, requirePermission("pages", "update"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const { sectionId } = c.req.param();
  const body = await c.req.json();

  const updateData: Record<string, unknown> = {};
  if ("section_name" in body) updateData.sectionName = body.section_name;
  if ("section_header" in body) updateData.sectionHeader = body.section_header;
  if ("button_labels" in body) updateData.buttonLabels = body.button_labels;
  if ("layout_order" in body) updateData.layoutOrder = body.layout_order;
  if ("is_visible" in body) updateData.isVisible = body.is_visible;
  if ("canvas_height" in body) updateData.canvasHeight = body.canvas_height;
  if ("template_name" in body) updateData.templateName = body.template_name; // set to save-as-template; null to un-save

  await db.update(pageSections).set(updateData).where(eq(pageSections.id, sectionId));

  const result = await db.select().from(pageSections).where(eq(pageSections.id, sectionId));
  if (!result[0]) return c.json({ error: "Not found" }, 404);
  return c.json(await loadSectionWithInstances(db, result[0]));
});

// DELETE /sections/:sectionId
adminPageBuilderRouter.delete("/sections/:sectionId", authMiddleware, requirePermission("pages", "delete"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const { sectionId } = c.req.param();
  const result = await db.select().from(pageSections).where(eq(pageSections.id, sectionId));
  if (!result[0]) return c.json({ error: "Not found" }, 404);
  await db.delete(pageSections).where(eq(pageSections.id, sectionId)); // cascades to pageSectionComponents
  return c.json({ message: "Deleted successfully" });
});

// POST /sections/reorder
adminPageBuilderRouter.post("/sections/reorder", authMiddleware, requirePermission("pages", "update"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const body = await c.req.json();
  const sections: { id: string; layout_order: number }[] = body.sections;
  await Promise.all(
    sections.map((s) => db.update(pageSections).set({ layoutOrder: s.layout_order }).where(eq(pageSections.id, s.id)))
  );
  return c.json({ success: true });
});

// GET /templates — all sections saved as templates (templateName is set)
adminPageBuilderRouter.get("/templates", authMiddleware, requirePermission("pages", "read"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const templates = await db
    .select({
      id: pageSections.id,
      pageId: pageSections.pageId,
      sectionName: pageSections.sectionName,
      sectionHeader: pageSections.sectionHeader,
      buttonLabels: pageSections.buttonLabels,
      canvasHeight: pageSections.canvasHeight,
      templateName: pageSections.templateName,
      createdAt: pageSections.createdAt,
      pageName: pages.name,
    })
    .from(pageSections)
    .leftJoin(pages, eq(pageSections.pageId, pages.id))
    .where(isNotNull(pageSections.templateName));

  const withInstances = await Promise.all(templates.map((t: any) => loadSectionWithInstances(db, t)));
  return c.json(withInstances);
});

// POST /templates/:sectionId/use — clone a template section (AND all its
// component instances/positions) onto another page.
adminPageBuilderRouter.post("/templates/:sectionId/use", authMiddleware, requirePermission("pages", "create"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const { sectionId } = c.req.param();
  const body = await c.req.json();

  const template = await db.select().from(pageSections).where(eq(pageSections.id, sectionId));
  if (!template[0]) return c.json({ error: "Template not found" }, 404);
  const t = template[0];

  const clonedSection = {
    id: crypto.randomUUID(),
    pageId: body.pageId,
    sectionName: t.sectionName,
    sectionHeader: t.sectionHeader,
    buttonLabels: t.buttonLabels,
    componentId: null,
    componentConfig: null,
    layoutOrder: body.layout_order ?? 0,
    isVisible: true,
    canvasHeight: t.canvasHeight,
    templateName: t.templateName, // stays linked to the template name/lineage
    createdAt: new Date().toISOString(),
  } as typeof pageSections.$inferInsert;
  await db.insert(pageSections).values(clonedSection);

  const templateInstances = await db
    .select()
    .from(pageSectionComponents)
    .where(eq(pageSectionComponents.sectionId, sectionId));

  if (templateInstances.length > 0) {
    await db.insert(pageSectionComponents).values(
      templateInstances.map((inst: any) => ({
        id: crypto.randomUUID(),
        sectionId: clonedSection.id,
        componentId: inst.componentId,
        x: inst.x,
        y: inst.y,
        width: inst.width,
        height: inst.height,
        zIndex: inst.zIndex,
        propsOverride: inst.propsOverride,
        // NOTE: data bindings are NOT copied — a binding points at a
        // specific record (e.g. one specific product), which almost
        // certainly isn't right for a different page. The cloned instance
        // starts unbound with the template's static propsOverride/
        // placeholder only; the admin re-binds per page.
        dataBindings: {},
        createdAt: new Date().toISOString(),
      }))
    );
  }

  return c.json(await loadSectionWithInstances(db, clonedSection), 201);
});

// POST /pages/:pageId/publish — generate the page's TSX (free-form sections
// with resolved data bindings) and commit it to GitHub.
adminPageBuilderRouter.post("/pages/:pageId/publish", authMiddleware, requirePermission("pages", "update"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const { pageId } = c.req.param();

  const pageResult = await db.select().from(pages).where(eq(pages.id, pageId));
  if (!pageResult[0]) return c.json({ error: "Not found" }, 404);
  const page = pageResult[0];

  const sections = await db
    .select()
    .from(pageSections)
    .where(eq(pageSections.pageId, pageId))
    .orderBy(pageSections.layoutOrder);
  const visibleSections = sections.filter((s: any) => s.isVisible);

  const tableRefs = { products, collections, events, upcomingEvents };
  const usedComponentNames = new Set<string>();
  const sectionJsxBlocks: string[] = [];

  for (const section of visibleSections) {
    const rawInstances = await db
      .select({
        id: pageSectionComponents.id,
        x: pageSectionComponents.x,
        y: pageSectionComponents.y,
        width: pageSectionComponents.width,
        height: pageSectionComponents.height,
        zIndex: pageSectionComponents.zIndex,
        propsOverride: pageSectionComponents.propsOverride,
        dataBindings: pageSectionComponents.dataBindings,
        componentName: componentLibrary.name,
        componentStatus: componentLibrary.status,
      })
      .from(pageSectionComponents)
      .leftJoin(componentLibrary, eq(pageSectionComponents.componentId, componentLibrary.id))
      .where(eq(pageSectionComponents.sectionId, section.id));

    const publishableInstances = rawInstances.filter(
      (i: any) => i.componentName && i.componentStatus === "published"
    );

    const resolvedInstances: ComponentInstanceForCodegen[] = [];
    for (const inst of publishableInstances) {
      const boundProps = await resolveDataBindings(db, tableRefs, inst.dataBindings || {});
      resolvedInstances.push({
        id: inst.id,
        componentName: inst.componentName,
        x: inst.x,
        y: inst.y,
        width: inst.width,
        height: inst.height,
        zIndex: inst.zIndex,
        props: { ...(inst.propsOverride || {}), ...boundProps },
      });
      usedComponentNames.add(inst.componentName);
    }

    sectionJsxBlocks.push(
      `      {/* Section: ${section.sectionHeader ?? section.sectionName ?? "Unnamed"} */}\n` +
        `      <section>\n${generateSectionJSX(section.canvasHeight ?? 480, resolvedInstances)}\n      </section>`
    );
  }

  const pageName = toPageComponentName(page.name);
  const importLines = Array.from(usedComponentNames)
    .map((name) => `import ${name} from '../components/${name}';`)
    .join("\n");

  const generatedCode = `// Auto-generated by KEKAL Page Builder — do not hand-edit, changes will be
// overwritten on the next publish.
// Page: ${page.name}
// Generated: ${new Date().toISOString()}

import React from 'react';
${importLines ? "\n" + importLines : ""}

export default function ${pageName}() {
  return (
    <>
${sectionJsxBlocks.join("\n\n")}
    </>
  );
}
`;

  if (!c.env.GITHUB_TOKEN) {
    return c.json({ success: false, error: "GitHub not configured" });
  }

  const filePath = `src/kekal/pages/${pageName}.tsx`;
  const commitMessage = `feat: publish page ${page.name} from Page Builder`;

  const commitResult = await commitFileToFrontend(
    c.env.GITHUB_TOKEN,
    c.env.GITHUB_OWNER,
    c.env.GITHUB_REPO_FRONTEND,
    c.env.GITHUB_BRANCH,
    filePath,
    generatedCode,
    commitMessage
  );

  return c.json({
    success: commitResult.success,
    error: commitResult.error,
    commit_url: commitResult.commit_url ?? null,
    page_name: pageName,
    generated_code: generatedCode,
  });
});
