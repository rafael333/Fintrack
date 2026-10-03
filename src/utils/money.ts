export const toCents = (amount: number): number => Math.round(amount * 100)

export const fromCents = (cents: number): number => cents / 100

export const sumAmounts = (amounts: number[]): number =>
  fromCents(amounts.reduce((total, amount) => total + toCents(amount), 0))

export const splitInstallments = (amount: number, count: number): number[] => {
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isInteger(count) || count < 1) {
    throw new Error('Valor ou número de parcelas inválido')
  }

  const totalCents = toCents(amount)
  if (totalCents < count) {
    throw new Error('O valor deve permitir pelo menos R$ 0,01 por parcela')
  }
  const baseCents = Math.floor(totalCents / count)
  const remainder = totalCents - baseCents * count

  return Array.from({ length: count }, (_, index) =>
    fromCents(baseCents + (index >= count - remainder ? 1 : 0))
  )
}
