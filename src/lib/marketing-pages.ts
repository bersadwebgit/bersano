import { prisma } from '@/lib/prisma';
import { SignJWT, jwtVerify } from 'jose';

/**
 * Marketing page/section content layer (hybrid CMS).
 * - Public rendering reads only PUBLISHED, non-future pages.
 * - Preview uses a short-lived signed token (noindex) and renders any status
 *   through the SAME renderer as live, so preview == production output.
 * - Publish captures a revision; rollback restores a revision.
 */

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';
const key = new TextEncoder().encode(JWT_SECRET);
const PREVIEW_AUDIENCE = 'marketing-preview';

export interface SectionData {
  id: string;
  type: string;
  order: number;
  enabled: boolean;
  content: Record<string, any>;
  themeVariant: string;
  anchorId: string | null;
  visibility: string;
}

export interface PageData {
  id: string;
  slug: string;
  title: string;
  status: string;
  metaTitle: string | null;
  metaDesc: string | null;
  canonicalUrl: string | null;
  ogImage: string | null;
  noindex: boolean;
  structuredData: string | null;
  publishedAt: Date | null;
  scheduledAt: Date | null;
  sections: SectionData[];
}

function mapSection(s: any): SectionData {
  return {
    id: s.id,
    type: s.type,
    order: s.order,
    enabled: s.enabled,
    content: (s.content ?? {}) as Record<string, any>,
    themeVariant: s.themeVariant,
    anchorId: s.anchorId,
    visibility: s.visibility,
  };
}

function mapPage(p: any): PageData {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    status: p.status,
    metaTitle: p.metaTitle,
    metaDesc: p.metaDesc,
    canonicalUrl: p.canonicalUrl,
    ogImage: p.ogImage,
    noindex: p.noindex,
    structuredData: p.structuredData,
    publishedAt: p.publishedAt,
    scheduledAt: p.scheduledAt,
    sections: (p.sections || []).map(mapSection),
  };
}

/** Public reader: returns a page only if it is published and its publish time has passed. */
export async function getPublishedPage(slug: string): Promise<PageData | null> {
  try {
    const page = await prisma.marketingPage.findFirst({
      where: {
        slug,
        status: 'published',
        OR: [{ publishedAt: null }, { publishedAt: { lte: new Date() } }],
      },
      include: { sections: { where: { enabled: true }, orderBy: { order: 'asc' } } },
    });
    return page ? mapPage(page) : null;
  } catch (error) {
    console.error('[marketing-pages] getPublishedPage failed', error);
    return null;
  }
}

/** Preview reader: returns the page in ANY status (includes disabled sections for editor context). */
export async function getPageForPreview(slug: string): Promise<PageData | null> {
  try {
    const page = await prisma.marketingPage.findUnique({
      where: { slug },
      include: { sections: { orderBy: { order: 'asc' } } },
    });
    return page ? mapPage(page) : null;
  } catch (error) {
    console.error('[marketing-pages] getPageForPreview failed', error);
    return null;
  }
}

/** Signed, short-lived preview token (default 30 minutes). */
export async function createPreviewToken(slug: string, ttlMinutes = 30): Promise<string> {
  return new SignJWT({ slug })
    .setProtectedHeader({ alg: 'HS256' })
    .setAudience(PREVIEW_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${ttlMinutes}m`)
    .sign(key);
}

export async function verifyPreviewToken(token: string, slug: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, key, { audience: PREVIEW_AUDIENCE });
    return payload.slug === slug;
  } catch {
    return false;
  }
}

interface AuditInput {
  actorId?: string;
  actorName?: string;
  action: string;
  entity: string;
  entityId?: string;
  meta?: Record<string, any>;
}

export async function logMarketingAudit(input: AuditInput): Promise<void> {
  try {
    await prisma.marketingAuditLog.create({
      data: {
        actorId: input.actorId,
        actorName: input.actorName,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        meta: input.meta ?? undefined,
      },
    });
  } catch (error) {
    // Audit must never block the main flow.
    console.error('[marketing-pages] audit log failed', error);
  }
}

/** Capture a full snapshot of a page (with sections) as a revision. */
export async function captureRevision(
  pageId: string,
  opts: { label?: string; isAutosave?: boolean; authorId?: string; authorName?: string } = {},
): Promise<void> {
  try {
    const page = await prisma.marketingPage.findUnique({
      where: { id: pageId },
      include: { sections: { orderBy: { order: 'asc' } } },
    });
    if (!page) return;
    await prisma.marketingRevision.create({
      data: {
        pageId,
        snapshot: page as any,
        label: opts.label,
        isAutosave: opts.isAutosave ?? false,
        authorId: opts.authorId,
        authorName: opts.authorName,
      },
    });
    // Retain a bounded history: keep the latest 50 revisions per page.
    const stale = await prisma.marketingRevision.findMany({
      where: { pageId },
      orderBy: { createdAt: 'desc' },
      skip: 50,
      select: { id: true },
    });
    if (stale.length > 0) {
      await prisma.marketingRevision.deleteMany({
        where: { id: { in: stale.map((s) => s.id) } },
      });
    }
  } catch (error) {
    console.error('[marketing-pages] captureRevision failed', error);
  }
}

/** Restore a page (and its sections) from a stored revision snapshot. */
export async function rollbackToRevision(revisionId: string, actor?: { id?: string; name?: string }): Promise<boolean> {
  try {
    const revision = await prisma.marketingRevision.findUnique({ where: { id: revisionId } });
    if (!revision) return false;
    const snap = revision.snapshot as any;
    if (!snap?.id) return false;

    await prisma.$transaction(async (tx) => {
      // Capture current state before overwriting.
      await tx.marketingSection.deleteMany({ where: { pageId: snap.id } });
      await tx.marketingPage.update({
        where: { id: snap.id },
        data: {
          title: snap.title,
          metaTitle: snap.metaTitle,
          metaDesc: snap.metaDesc,
          canonicalUrl: snap.canonicalUrl,
          ogImage: snap.ogImage,
          noindex: snap.noindex ?? false,
          structuredData: snap.structuredData,
        },
      });
      if (Array.isArray(snap.sections)) {
        for (const s of snap.sections) {
          await tx.marketingSection.create({
            data: {
              pageId: snap.id,
              type: s.type,
              order: s.order ?? 0,
              enabled: s.enabled ?? true,
              content: s.content ?? {},
              themeVariant: s.themeVariant ?? 'surface',
              anchorId: s.anchorId ?? null,
              visibility: s.visibility ?? 'all',
            },
          });
        }
      }
    });

    await logMarketingAudit({
      actorId: actor?.id,
      actorName: actor?.name,
      action: 'rollback',
      entity: 'page',
      entityId: snap.id,
      meta: { revisionId },
    });
    return true;
  } catch (error) {
    console.error('[marketing-pages] rollbackToRevision failed', error);
    return false;
  }
}
