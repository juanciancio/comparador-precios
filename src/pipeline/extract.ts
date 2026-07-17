import { vtexProductSchema } from '../schemas/vtex-product.ts';
import {
  normalizeEan,
  normalizeBrand,
  classifyBadEan,
  joinVtexNames,
  type BadEanReason,
} from './transform.ts';

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
  // Precio base sobre el que VTEX calcula los descuentos ya aplicados a `price`.
  // En Carrefour es el precio NO-socio (el que paga quien no tiene Mi Crf); `price`
  // es el de socio. null solo cuando VTEX omite el campo (raro): NO se cae a `price`
  // para no inventar un no-socio igual al socio. Ver research/mi-crf-precio-capturado.
  priceWithoutDiscount: number | null;
  promoDescription: string | null;
  /** Nombre crudo del descuento aplicado a `price`, si VTEX lo expone. */
  discountHighlight: string | null;
  isAvailable: boolean;
  // `hasPromo` NO vive acá: no se captura de VTEX, se deriva de (price, listPrice).
  // Lo calcula `load` sobre los valores ya redondeados que efectivamente escribe,
  // así el invariante has_promo === (list_price > price) vale sobre lo guardado y
  // no sobre lo observado. Ver computeHasPromo en transform.ts.
}

export type ExtractWarning =
  | { kind: 'zod'; productId: string | null; issues: unknown }
  | { kind: 'no_ean'; productId: string; name: string }
  | { kind: 'bad_ean'; productId: string; name: string; raw: string; reason: BadEanReason }
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
    const rawEan = item.ean?.trim();
    if (!rawEan) {
      warnings.push({ kind: 'no_ean', productId: product.productId, name: item.name });
      continue;
    }
    // Canonizar antes de tocar la DB: distintos retailers reportan el mismo GTIN
    // con o sin padding de ceros. Ver anti-pattern 12 en CLAUDE.md.
    const eanResult = normalizeEan(rawEan);
    if (!eanResult.ok) {
      warnings.push({
        kind: 'bad_ean',
        productId: product.productId,
        name: item.name,
        raw: rawEan,
        reason: classifyBadEan(eanResult.error),
      });
      continue;
    }
    const ean = eanResult.value;
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
      brand: product.brand ? normalizeBrand(product.brand) || null : null,
      categoryPath: product.categories[0] ?? null,
      imageUrl: item.images[0]?.imageUrl ?? null,
      productUrl: `https://${host}/${product.linkText}/p`,
      price: offer.Price,
      listPrice: offer.ListPrice ?? null,
      // ?? null (no ?? Price): null significa "VTEX no lo expuso", no "no hay
      // descuento". Cuando no hay descuento, VTEX manda PriceWithoutDiscount == Price
      // y el campo queda poblado igual (ver caso borde 1 del diseño).
      priceWithoutDiscount: offer.PriceWithoutDiscount ?? null,
      // Las dos fuentes son la misma promo con distinta serialización; joinVtexNames
      // deduplica. Se leen ambas para no depender de cuál serializa bien VTEX hoy.
      promoDescription: joinVtexNames(offer.Teasers, offer.PromotionTeasers),
      discountHighlight: joinVtexNames(offer.DiscountHighLight),
      isAvailable: offer.IsAvailable && offer.AvailableQuantity > 0,
    });
  }

  return { rows, warnings };
}
