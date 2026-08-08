import { Hono } from "hono";
import { eq, isNotNull } from "drizzle-orm";
import { createDb } from "../../db/index";
import { pageSections } from "../../db/schema/pageSections";
import { pages } from "../../db/schema/pages";
import { componentLibrary } from "../../db/schema/componentLibrary";
import { authMiddleware, requirePermission } from "../../middleware/auth";
import { commitFileToFrontend } from "../../lib/github";

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

// Helper: convert a page name string to PascalCase + "Page"
function toPageComponentName(name: string): string {
  return (
    name
      .split(/\s+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join("") + "Page"
  );
}

// GET /pages — all pages with their ordered sections (joined with component info)
adminPageBuilderRouter.get(
  "/pages",
  authMiddleware,
  requirePermission("pages", "read"),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);

    const allPages = await db.select().from(pages);

    const allSections = await db
      .select({
        id: pageSections.id,
        pageId: pageSections.pageId,
        sectionName: pageSections.sectionName,
        sectionHeader: pageSections.sectionHeader,
        sectionContent: pageSections.sectionContent,
        buttonLabels: pageSections.buttonLabels,
        componentId: pageSections.componentId,
        componentConfig: pageSections.componentConfig,
        layoutOrder: pageSections.layoutOrder,
        isVisible: pageSections.isVisible,
        templateName: pageSections.templateName,
        createdAt: pageSections.createdAt,
        componentDisplayName: componentLibrary.displayName,
        componentCategory: componentLibrary.category,
      })
      .from(pageSections)
      .leftJoin(
        componentLibrary,
        eq(pageSections.componentId, componentLibrary.id)
      )
      .orderBy(pageSections.layoutOrder);

    const result = allPages.map((page) => ({
      ...page,
      sections: allSections.filter((s) => s.pageId === page.id),
    }));

    return c.json(result);
  }
);

// GET /pages/:pageId — single page with ordered sections
adminPageBuilderRouter.get(
  "/pages/:pageId",
  authMiddleware,
  requirePermission("pages", "read"),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const { pageId } = c.req.param();

    const pageResult = await db
      .select()
      .from(pages)
      .where(eq(pages.id, pageId));
    if (!pageResult[0]) return c.json({ error: "Not found" }, 404);

    const sections = await db
      .select({
        id: pageSections.id,
        pageId: pageSections.pageId,
        sectionName: pageSections.sectionName,
        sectionHeader: pageSections.sectionHeader,
        sectionContent: pageSections.sectionContent,
        buttonLabels: pageSections.buttonLabels,
        componentId: pageSections.componentId,
        componentConfig: pageSections.componentConfig,
        layoutOrder: pageSections.layoutOrder,
        isVisible: pageSections.isVisible,
        templateName: pageSections.templateName,
        createdAt: pageSections.createdAt,
        componentDisplayName: componentLibrary.displayName,
        componentCategory: componentLibrary.category,
      })
      .from(pageSections)
      .leftJoin(
        componentLibrary,
        eq(pageSections.componentId, componentLibrary.id)
      )
      .where(eq(pageSections.pageId, pageId))
      .orderBy(pageSections.layoutOrder);

    return c.json({ ...pageResult[0], sections });
  }
);

// POST /pages/:pageId/sections — add a section to a page
adminPageBuilderRouter.post(
  "/pages/:pageId/sections",
  authMiddleware,
  requirePermission("pages", "create"),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const { pageId } = c.req.param();
    const body = await c.req.json();

    const newSection = {
      id: crypto.randomUUID(),
      pageId,
      componentId: body.component_id ?? null,
      sectionName: body.section_name ?? null,
      sectionHeader: body.section_header ?? null,
      sectionContent: body.section_content ?? null,
      buttonLabels: body.button_labels ?? [],
      componentConfig: body.component_config ?? null,
      layoutOrder: body.layout_order ?? 0,
      isVisible: true,
      templateName: null,
      createdAt: new Date().toISOString(),
    } as typeof pageSections.$inferInsert;

    await db.insert(pageSections).values(newSection);
    return c.json(newSection, 201);
  }
);

// PATCH /sections/:sectionId — update a section
adminPageBuilderRouter.patch(
  "/sections/:sectionId",
  authMiddleware,
  requirePermission("pages", "update"),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const { sectionId } = c.req.param();
    const body = await c.req.json();

    const updateData: Record<string, unknown> = {};
    if ("section_name" in body) updateData.sectionName = body.section_name;
    if ("section_header" in body) updateData.sectionHeader = body.section_header;
    if ("section_content" in body) updateData.sectionContent = body.section_content;
    if ("button_labels" in body) updateData.buttonLabels = body.button_labels;
    if ("component_config" in body) updateData.componentConfig = body.component_config;
    if ("layout_order" in body) updateData.layoutOrder = body.layout_order;
    if ("is_visible" in body) updateData.isVisible = body.is_visible;
    if ("template_name" in body) updateData.templateName = body.template_name;

    await db
      .update(pageSections)
      .set(updateData)
      .where(eq(pageSections.id, sectionId));

    const result = await db
      .select()
      .from(pageSections)
      .where(eq(pageSections.id, sectionId));
    if (!result[0]) return c.json({ error: "Not found" }, 404);
    return c.json(result[0]);
  }
);

// DELETE /sections/:sectionId — delete a section
adminPageBuilderRouter.delete(
  "/sections/:sectionId",
  authMiddleware,
  requirePermission("pages", "delete"),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const { sectionId } = c.req.param();

    const result = await db
      .select()
      .from(pageSections)
      .where(eq(pageSections.id, sectionId));
    if (!result[0]) return c.json({ error: "Not found" }, 404);

    await db.delete(pageSections).where(eq(pageSections.id, sectionId));
    return c.json({ message: "Deleted successfully" });
  }
);

// POST /sections/reorder — bulk update layout_order
adminPageBuilderRouter.post(
  "/sections/reorder",
  authMiddleware,
  requirePermission("pages", "update"),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const body = await c.req.json();
    const sections: { id: string; layout_order: number }[] = body.sections;

    await Promise.all(
      sections.map((s) =>
        db
          .update(pageSections)
          .set({ layoutOrder: s.layout_order })
          .where(eq(pageSections.id, s.id))
      )
    );

    return c.json({ success: true });
  }
);

// GET /templates — all sections that are saved as templates
adminPageBuilderRouter.get(
  "/templates",
  authMiddleware,
  requirePermission("pages", "read"),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);

    const templates = await db
      .select({
        id: pageSections.id,
        pageId: pageSections.pageId,
        sectionName: pageSections.sectionName,
        sectionHeader: pageSections.sectionHeader,
        sectionContent: pageSections.sectionContent,
        buttonLabels: pageSections.buttonLabels,
        componentId: pageSections.componentId,
        componentConfig: pageSections.componentConfig,
        layoutOrder: pageSections.layoutOrder,
        isVisible: pageSections.isVisible,
        templateName: pageSections.templateName,
        createdAt: pageSections.createdAt,
        pageName: pages.name,
        componentDisplayName: componentLibrary.displayName,
        componentCategory: componentLibrary.category,
      })
      .from(pageSections)
      .leftJoin(pages, eq(pageSections.pageId, pages.id))
      .leftJoin(
        componentLibrary,
        eq(pageSections.componentId, componentLibrary.id)
      )
      .where(isNotNull(pageSections.templateName));

    return c.json(templates);
  }
);

// POST /templates/:sectionId/use — clone a template section onto a page
adminPageBuilderRouter.post(
  "/templates/:sectionId/use",
  authMiddleware,
  requirePermission("pages", "create"),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const { sectionId } = c.req.param();
    const body = await c.req.json();

    const template = await db
      .select()
      .from(pageSections)
      .where(eq(pageSections.id, sectionId));
    if (!template[0]) return c.json({ error: "Template not found" }, 404);

    const t = template[0];
    const cloned = {
      id: crypto.randomUUID(),
      pageId: body.pageId,
      componentId: t.componentId,
      componentConfig: t.componentConfig,
      sectionName: t.sectionName,
      sectionHeader: t.sectionHeader,
      sectionContent: t.sectionContent,
      buttonLabels: t.buttonLabels,
      templateName: t.templateName,
      layoutOrder: body.layout_order ?? 0,
      isVisible: true,
      createdAt: new Date().toISOString(),
    } as typeof pageSections.$inferInsert;

    await db.insert(pageSections).values(cloned);
    return c.json(cloned, 201);
  }
);

// POST /pages/:pageId/publish — generate TSX and commit to GitHub
adminPageBuilderRouter.post(
  "/pages/:pageId/publish",
  authMiddleware,
  requirePermission("pages", "update"),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const { pageId } = c.req.param();

    const pageResult = await db
      .select()
      .from(pages)
      .where(eq(pages.id, pageId));
    if (!pageResult[0]) return c.json({ error: "Not found" }, 404);
    const page = pageResult[0];

    const sections = await db
      .select()
      .from(pageSections)
      .where(eq(pageSections.pageId, pageId))
      .orderBy(pageSections.layoutOrder);

    const visibleSections = sections.filter((s) => s.isVisible);

    const sectionsWithComponents = await Promise.all(
      visibleSections.map(async (s) => {
        if (!s.componentId) return { ...s, component: null };
        const comp = await db
          .select()
          .from(componentLibrary)
          .where(eq(componentLibrary.id, s.componentId));
        return { ...s, component: comp[0] ?? null };
      })
    );

    const pageName = toPageComponentName(page.name);

    const componentNames = [
      ...new Set(
        sectionsWithComponents
          .filter((s) => s.component !== null)
          .map((s) => s.component!.displayName)
      ),
    ];

    const importLines = componentNames
      .map((name) => `import ${name} from '../components/${name}';`)
      .join("\n");

    const jsxLines = sectionsWithComponents
      .map((s) => {
        if (s.component) {
          const name = s.component.displayName;
          if (s.componentConfig) {
            try {
              const props = JSON.parse(s.componentConfig);
              const propsStr = Object.entries(props)
                .map(([k, v]) =>
                  typeof v === "string"
                    ? `${k}="${v}"`
                    : `${k}={${JSON.stringify(v)}}`
                )
                .join(" ");
              return `        <${name} ${propsStr} />`;
            } catch {
              return `        <${name} />`;
            }
          }
          return `        <${name} />`;
        }
        return `        {/* Section: ${s.sectionHeader ?? s.sectionName ?? "Unnamed"} */}`;
      })
      .join("\n");

    const generatedCode = `// Auto-generated by KEKAL Page Builder
// Page: ${page.name}
// Generated: ${new Date().toISOString()}

import React from 'react';
${importLines ? "\n" + importLines : ""}

export default function ${pageName}() {
  return (
    <>
${jsxLines}
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
      success: true,
      commit_url: commitResult.commit?.html_url ?? null,
      page_name: pageName,
      generated_code: generatedCode,
    });
  }
);