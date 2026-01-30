// Export HTML inline pour envoi email

import type { NewsletterDocument, NewsletterBlock } from '@/types/newsletter-studio';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

/**
 * Génère le HTML inline compatible email à partir d'un document
 */
export function exportToHtml(document: NewsletterDocument): string {
  const { blocks, globalStyles, metadata } = document;
  const sortedBlocks = [...blocks].sort((a, b) => a.order - b.order);
  
  const isAnsutRadar = metadata.template === 'ansut_radar';
  const primaryColor = globalStyles.primaryColor;
  const accentColor = globalStyles.accentColor;

  let blocksHtml = '';

  for (const block of sortedBlocks) {
    blocksHtml += renderBlockToHtml(block, { primaryColor, accentColor, isAnsutRadar, metadata });
  }

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${isAnsutRadar ? 'ANSUT RADAR' : "INNOV'ACTU"} #${metadata.numero}</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:${globalStyles.fontFamily};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td align="center" style="padding:20px 10px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:${globalStyles.maxWidth};background-color:${globalStyles.backgroundColor};border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
          ${blocksHtml}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

interface RenderContext {
  primaryColor: string;
  accentColor: string;
  isAnsutRadar: boolean;
  metadata: NewsletterDocument['metadata'];
}

function renderBlockToHtml(block: NewsletterBlock, ctx: RenderContext): string {
  const { style, content } = block;
  
  switch (block.type) {
    case 'header':
      return renderHeader(content, style, ctx);
    case 'edito':
      return renderEdito(content, style, ctx);
    case 'article':
      return renderArticle(content, style, ctx);
    case 'tech':
      return renderTech(content, style, ctx);
    case 'chiffre':
      return renderChiffre(content, style, ctx);
    case 'agenda':
      return renderAgenda(content, style, ctx);
    case 'image':
      return renderImage(content, style);
    case 'separator':
      return renderSeparator(style);
    case 'button':
      return renderButton(content, style);
    case 'footer':
      return renderFooter(content, style);
    case 'text':
      return renderText(content, style, ctx);
    default:
      return '';
  }
}

function renderHeader(content: Record<string, unknown>, style: NewsletterBlock['style'], ctx: RenderContext): string {
  const bgColor = style.backgroundColor || ctx.primaryColor;
  const dateStr = format(new Date(ctx.metadata.dateDebut), 'd MMMM yyyy', { locale: fr });
  
  let headerImageHtml = '';
  if (content.headerImageUrl) {
    headerImageHtml = `<tr><td><img src="${content.headerImageUrl}" alt="${content.headerImageAlt || ''}" style="width:100%;height:auto;display:block;" /></td></tr>`;
  }

  return `<tr>
    <td style="background:linear-gradient(135deg, ${bgColor} 0%, ${ctx.primaryColor} 100%);padding:${style.padding || '24px'};">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td>
            <table role="presentation" cellspacing="0" cellpadding="0" border="0">
              <tr>
                <td style="width:56px;height:56px;background:#ffffff;border-radius:12px;text-align:center;vertical-align:middle;">
                  <span style="font-size:28px;">📡</span>
                </td>
                <td style="padding-left:16px;">
                  <div style="font-size:28px;font-weight:800;color:${ctx.accentColor};letter-spacing:-0.5px;">${content.title || (ctx.isAnsutRadar ? 'ANSUT RADAR' : "INNOV'ACTU")}</div>
                  <div style="font-size:12px;color:rgba(255,255,255,0.9);text-transform:uppercase;letter-spacing:2px;">${content.subtitle || 'Newsletter Stratégique'}</div>
                </td>
              </tr>
            </table>
          </td>
          <td style="text-align:right;vertical-align:top;">
            <div style="background:${ctx.accentColor};color:#ffffff;padding:8px 16px;border-radius:8px;font-weight:700;font-size:16px;display:inline-block;">N°${ctx.metadata.numero}</div>
            <div style="color:rgba(255,255,255,0.85);font-size:13px;margin-top:8px;">${dateStr}</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr><td style="height:6px;background:linear-gradient(90deg, ${ctx.accentColor} 0%, #ff8a00 50%, ${ctx.accentColor} 100%);"></td></tr>
  ${headerImageHtml}`;
}

function renderEdito(content: Record<string, unknown>, style: NewsletterBlock['style'], ctx: RenderContext): string {
  return `<tr>
    <td style="padding:${style.padding || '24px'};background:${style.backgroundColor || '#ffffff'};">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td>
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
              <span style="width:36px;height:36px;background:#fef3c7;border-radius:10px;text-align:center;line-height:36px;font-size:18px;">📝</span>
              <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:${ctx.accentColor};">Édito</span>
            </div>
            <blockquote style="margin:0;padding-left:16px;border-left:4px solid ${ctx.accentColor};font-style:italic;color:#6b7280;line-height:1.7;">
              ${content.text || ''}
            </blockquote>
            <p style="text-align:right;margin-top:16px;font-size:13px;color:#9ca3af;font-weight:500;">— ${content.author || 'La Rédaction ANSUT'}</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

function renderArticle(content: Record<string, unknown>, style: NewsletterBlock['style'], ctx: RenderContext): string {
  const index = content.index || 1;
  let imageHtml = '';
  if (content.imageUrl) {
    imageHtml = `<img src="${content.imageUrl}" alt="${content.imageAlt || ''}" style="width:100%;height:auto;border-radius:8px;margin-bottom:12px;" />`;
  }

  return `<tr>
    <td style="padding:16px ${style.padding || '24px'};">
      <div style="background:${style.backgroundColor || '#fff8f0'};padding:${style.padding || '20px'};border-radius:${style.borderRadius || '12px'};border-left:4px solid ${style.borderColor || ctx.accentColor};">
        ${imageHtml}
        <h3 style="margin:0 0 12px 0;font-size:16px;font-weight:600;color:#1f2937;display:flex;align-items:flex-start;gap:10px;">
          <span style="flex-shrink:0;width:24px;height:24px;background:${ctx.accentColor};color:#ffffff;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:700;">${index}</span>
          ${content.title || ''}
        </h3>
        <p style="margin:0 0 8px 34px;font-size:14px;color:#6b7280;">
          <strong style="color:#374151;">Pourquoi :</strong> ${content.pourquoi || ''}
        </p>
        <p style="margin:0 0 0 34px;font-size:14px;color:#16a34a;font-weight:600;">
          → ${content.impact || ''}
        </p>
      </div>
    </td>
  </tr>`;
}

function renderTech(content: Record<string, unknown>, style: NewsletterBlock['style'], ctx: RenderContext): string {
  let imageHtml = '';
  if (content.imageUrl) {
    imageHtml = `<img src="${content.imageUrl}" alt="${content.imageAlt || ''}" style="width:100%;height:auto;border-radius:12px;margin-bottom:16px;" />`;
  }

  return `<tr>
    <td style="padding:24px;background:${style.backgroundColor || '#e3f2fd'};">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
        <span style="width:36px;height:36px;background:#3b82f6;color:#ffffff;border-radius:10px;text-align:center;line-height:36px;font-size:18px;">🔬</span>
        <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#1d4ed8;">Technologie</span>
      </div>
      ${imageHtml}
      <h3 style="margin:0 0 12px 0;font-size:18px;font-weight:600;color:#1e3a8a;">${content.title || ''}</h3>
      <p style="margin:0 0 16px 0;font-size:14px;color:#1e40af;line-height:1.6;">${content.content || ''}</p>
      <div style="background:#ffffff;padding:16px;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <strong style="color:${ctx.accentColor};">👉 Pour l'ANSUT :</strong>
        <span style="color:#1e3a8a;margin-left:4px;">${content.lienAnsut || ''}</span>
      </div>
    </td>
  </tr>`;
}

function renderChiffre(content: Record<string, unknown>, style: NewsletterBlock['style'], ctx: RenderContext): string {
  return `<tr>
    <td style="background:linear-gradient(135deg, ${style.backgroundColor || ctx.primaryColor} 0%, ${ctx.primaryColor} 100%);padding:${style.padding || '48px'};text-align:center;">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:3px;color:rgba(255,255,255,0.7);margin-bottom:8px;">📊 Le Chiffre Marquant</div>
      <div style="font-size:64px;font-weight:800;color:${ctx.accentColor};margin:16px 0;">${content.valeur || ''}</div>
      <div style="font-size:24px;font-weight:600;color:rgba(255,255,255,0.9);text-transform:uppercase;letter-spacing:4px;margin-bottom:8px;">${content.unite || ''}</div>
      <div style="font-size:14px;color:rgba(255,255,255,0.75);max-width:400px;margin:0 auto;">${content.contexte || ''}</div>
    </td>
  </tr>`;
}

function renderAgenda(content: Record<string, unknown>, style: NewsletterBlock['style'], ctx: RenderContext): string {
  let items: Array<{ type: string; titre: string; date?: string }> = [];
  try {
    items = JSON.parse((content.items as string) || '[]');
  } catch {
    items = [];
  }

  const typeIcons: Record<string, string> = {
    evenement: '📆',
    appel_projets: '📢',
    deploiement: '🚀',
    decision: '⚖️'
  };

  const typeColors: Record<string, string> = {
    evenement: '#8b5cf6',
    appel_projets: '#10b981',
    deploiement: '#3b82f6',
    decision: '#f59e0b'
  };

  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid rgba(0,0,0,0.05);">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td style="width:40px;vertical-align:top;">
              <span style="width:32px;height:32px;background:${typeColors[item.type] || '#9ca3af'};border-radius:8px;display:inline-block;text-align:center;line-height:32px;">${typeIcons[item.type] || '📌'}</span>
            </td>
            <td style="padding-left:12px;">
              <div style="font-weight:600;color:#1f2937;font-size:14px;">${item.titre}</div>
              ${item.date ? `<div style="font-size:12px;color:#6b7280;margin-top:2px;">${item.date}</div>` : ''}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `).join('');

  return `<tr>
    <td style="padding:24px;background:${style.backgroundColor || '#f3e5f5'};">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
        <span style="width:36px;height:36px;background:#7c3aed;color:#ffffff;border-radius:10px;text-align:center;line-height:36px;font-size:18px;">📅</span>
        <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#7c3aed;">À Venir</span>
      </div>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        ${itemsHtml}
      </table>
    </td>
  </tr>`;
}

function renderImage(content: Record<string, unknown>, style: NewsletterBlock['style']): string {
  if (!content.url) return '';
  
  return `<tr>
    <td style="padding:${style.padding || '0'};">
      <img src="${content.url}" alt="${content.alt || ''}" style="width:100%;height:auto;display:block;border-radius:${style.borderRadius || '0'};" />
      ${content.caption ? `<p style="font-size:12px;color:#6b7280;text-align:center;margin:8px 0 0 0;">${content.caption}</p>` : ''}
    </td>
  </tr>`;
}

function renderSeparator(style: NewsletterBlock['style']): string {
  return `<tr>
    <td style="padding:${style.padding || '16px'} 24px;">
      <hr style="border:none;border-top:1px solid ${style.borderColor || '#e5e7eb'};margin:0;" />
    </td>
  </tr>`;
}

function renderButton(content: Record<string, unknown>, style: NewsletterBlock['style']): string {
  return `<tr>
    <td style="padding:16px 24px;text-align:${style.textAlign || 'center'};">
      <a href="${content.url || '#'}" style="display:inline-block;background:${style.backgroundColor || '#e65100'};color:${style.textColor || '#ffffff'};padding:${style.padding || '12px 24px'};border-radius:${style.borderRadius || '8px'};text-decoration:none;font-weight:600;font-size:14px;">
        ${content.text || 'En savoir plus'}
      </a>
    </td>
  </tr>`;
}

function renderFooter(content: Record<string, unknown>, style: NewsletterBlock['style']): string {
  return `<tr>
    <td style="background:${style.backgroundColor || '#f5f5f5'};padding:${style.padding || '32px'};text-align:${style.textAlign || 'center'};">
      <p style="margin:0 0 8px 0;font-size:14px;font-weight:600;color:#374151;">ANSUT</p>
      <p style="margin:0 0 4px 0;font-size:12px;color:${style.textColor || '#6b7280'};">${content.address || ''}</p>
      ${content.email ? `<p style="margin:0 0 16px 0;font-size:12px;color:${style.textColor || '#6b7280'};">${content.email}</p>` : ''}
      <a href="#" style="font-size:11px;color:#9ca3af;text-decoration:underline;">${content.unsubscribeText || 'Se désabonner'}</a>
    </td>
  </tr>`;
}

function renderText(content: Record<string, unknown>, style: NewsletterBlock['style'], ctx: RenderContext): string {
  // Cas spécial: décryptage
  if (content.sectionType === 'decryptage') {
    return `<tr>
      <td style="padding:24px;background:${style.backgroundColor || '#fffde7'};">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
          <span style="width:36px;height:36px;background:#f59e0b;color:#ffffff;border-radius:10px;text-align:center;line-height:36px;font-size:18px;">📚</span>
          <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#b45309;">En 2 Minutes</span>
        </div>
        <h3 style="margin:0 0 12px 0;font-size:18px;font-weight:600;color:#92400e;">${content.title || ''}</h3>
        <p style="margin:0;font-size:14px;color:#a16207;line-height:1.6;">${content.text || ''}</p>
      </td>
    </tr>`;
  }

  return `<tr>
    <td style="padding:${style.padding || '16px'} 24px;background:${style.backgroundColor || 'transparent'};">
      <p style="margin:0;font-size:${style.fontSize || '14px'};color:${style.textColor || '#374151'};line-height:1.6;text-align:${style.textAlign || 'left'};">
        ${content.text || ''}
      </p>
    </td>
  </tr>`;
}
