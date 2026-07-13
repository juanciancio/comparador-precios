import { vtexProductSchema } from '../schemas/vtex-product.ts';

/** Una fila por SKU (item). `extract` solo emite crudo; load decide skip/arrastre. */
export interface ExtractedSku {
  ean: string;
  productId: string;
  skuId: string;
  retailerName: string;
  brand: string | null;
  categoryPath: string | null;
  imageUrl: string | null;
  productUrl: string;
  price: number; // crudo observado (VTEX manda 0 en no disponibles)
  listPrice: number | null;
  hasPromo: boolean;
  promoDescription: string | null;
  isAvailable: boolean;
}

export type ExtractWarning =
  | { kind: 'zod'; productId: string | null; issues: unknown }
  | { kind: 'no_ean'; productId: string; name: string }
  | { kind: 'no_seller'; productId: string; skuId: string };

export interface ExtractResult {
  rows: ExtractedSku[];
  warnings: ExtractWarning[];
}

/** Valida el producto con Zod (por-producto) y lo baja a filas por SKU. */
export function extractSkus(raw: unknown, host: string): ExtractResult {
  const rows: ExtractedSku[] = [];
  const warnings: ExtractWarning[] = [];

  const parsed = vtexProductSchema.safeParse(raw);
  if (!parsed.success) {
    const productId =
      typeof raw === 'object' && raw !== null && typeof (raw as { productId?: unknown }).productId === 'string'
        ? (raw as { productId: string }).productId
        : null;
    warnings.push({ kind: 'zod', productId, issues: parsed.error.issues.slice(0, 3) });
    return { rows, warnings };
  }

  const product = parsed.data;
  for (const item of product.items) {
    const ean = item.ean?.trim();
    if (!ean) {
      warnings.push({ kind: 'no_ean', productId: product.productId, name: item.name });
      continue;
    }
    const seller = item.sellers.find((s) => s.sellerDefault) ?? item.sellers[0];
    if (!seller) {
      warnings.push({ kind: 'no_seller', productId: product.productId, skuId: item.itemId });
      continue;
    }
    const offer = seller.commertialOffer;
    rows.push({
      ean,
      productId: product.productId,
      skuId: item.itemId,
      retailerName: item.name,
      brand: product.brand ?? null,
      categoryPath: product.categories[0] ?? null,
      imageUrl: item.images[0]?.imageUrl ?? null,
      productUrl: `https://${host}/${product.linkText}/p`,
      price: offer.Price,
      listPrice: offer.ListPrice ?? null,
      hasPromo: offer.Teasers.length > 0,
      promoDescription: offer.Teasers.flatMap((t) => (t.Name ? [t.Name] : [])).join('; ') || null,
      isAvailable: offer.IsAvailable && offer.AvailableQuantity > 0,
    });
  }

  return { rows, warnings };
}
