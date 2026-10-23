/**
 * Taxa da plataforma: 5% sobre o preço de face de cada ingresso pago.
 *
 * - pass_to_buyer: comprador paga P + F; organizador fica com P (bruto).
 * - absorb:        comprador paga P;     organizador fica com P − F (bruto).
 *
 * A taxa de processamento do gateway sai sempre do bruto do organizador
 * (a cobrança é emitida na subconta dele e o split manda F para a plataforma).
 *
 * Todos os valores em centavos (inteiros). Nada de ponto flutuante.
 */

export const FEE_BPS = 500; // 500 basis points = 5,00%
export const FEE_PERCENT_LABEL = '5%';

export type FeeMode = 'pass_to_buyer' | 'absorb';

export interface PricedLine {
  priceCents: number;
  qty: number;
}

export interface OrderPricing {
  subtotalCents: number;
  platformFeeCents: number;
  buyerTotalCents: number;
  organizerGrossCents: number;
  /** Uma entrada por linha, na mesma ordem: taxa unitária usada no snapshot de order_items. */
  unitFeesCents: number[];
}

function assertCents(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${label} deve ser um inteiro >= 0 em centavos (recebido: ${value})`);
  }
}

/** Taxa de UM ingresso, arredondada ao centavo (meio para cima). Ingresso gratuito = 0. */
export function platformFee(priceCents: number, feeBps: number = FEE_BPS): number {
  assertCents(priceCents, 'priceCents');
  assertCents(feeBps, 'feeBps');
  return Math.floor((priceCents * feeBps + 5_000) / 10_000);
}

/**
 * Calcula o pedido somando a taxa POR INGRESSO (nunca 5% sobre o total),
 * para que o extrato por ingresso feche com o total do pedido.
 */
export function priceOrder(lines: PricedLine[], mode: FeeMode, feeBps: number = FEE_BPS): OrderPricing {
  if (lines.length === 0) throw new RangeError('Pedido sem ingressos');

  let subtotalCents = 0;
  let platformFeeCents = 0;
  const unitFeesCents: number[] = [];

  for (const { priceCents, qty } of lines) {
    if (!Number.isSafeInteger(qty) || qty < 1) throw new RangeError(`Quantidade inválida: ${qty}`);
    const unitFee = platformFee(priceCents, feeBps);
    unitFeesCents.push(unitFee);
    subtotalCents += priceCents * qty;
    platformFeeCents += unitFee * qty;
  }

  const buyerTotalCents = mode === 'pass_to_buyer' ? subtotalCents + platformFeeCents : subtotalCents;

  return {
    subtotalCents,
    platformFeeCents,
    buyerTotalCents,
    organizerGrossCents: buyerTotalCents - platformFeeCents,
    unitFeesCents,
  };
}

/** Pedido totalmente gratuito: não passa pelo gateway. */
export function isFreeOrder(pricing: Pick<OrderPricing, 'buyerTotalCents'>): boolean {
  return pricing.buyerTotalCents === 0;
}

/**
 * Na confirmação do pagamento: o gateway informa o líquido da cobrança.
 * processamento = cobrado − líquido; líquido do organizador = bruto − processamento.
 */
export function settle(
  pricing: Pick<OrderPricing, 'buyerTotalCents' | 'organizerGrossCents'>,
  gatewayNetCents: number,
): { processingFeeCents: number; organizerNetCents: number } {
  assertCents(gatewayNetCents, 'gatewayNetCents');
  const processingFeeCents = pricing.buyerTotalCents - gatewayNetCents;
  if (processingFeeCents < 0) {
    throw new RangeError('Líquido do gateway maior que o valor cobrado');
  }
  return { processingFeeCents, organizerNetCents: pricing.organizerGrossCents - processingFeeCents };
}

/** Split para a carteira da plataforma, no formato do Asaas (reais com 2 casas). */
export function asaasPlatformSplit(platformWalletId: string, platformFeeCents: number) {
  assertCents(platformFeeCents, 'platformFeeCents');
  return [{ walletId: platformWalletId, fixedValue: platformFeeCents / 100 }];
}
