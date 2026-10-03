import test from 'node:test'
import assert from 'node:assert/strict'
import { splitInstallments, sumAmounts } from '../src/utils/money.ts'
import { addMonthsClamped, formatLocalDate, parseLocalDate } from '../src/utils/dates.ts'

test('parcelas preservam o total exato em centavos', () => {
  assert.deepEqual(splitInstallments(100, 3), [33.33, 33.33, 33.34])
  assert.equal(sumAmounts(splitInstallments(100, 3)), 100)
  assert.deepEqual(splitInstallments(0.05, 3), [0.01, 0.02, 0.02])
  const manyInstallments = splitInstallments(100, 60)
  assert.equal(sumAmounts(manyInstallments), 100)
  assert.ok(Math.round((Math.max(...manyInstallments) - Math.min(...manyInstallments)) * 100) <= 1,
    'as parcelas devem variar no máximo um centavo')
  assert.throws(() => splitInstallments(0.02, 3))
})

test('somas monetárias evitam resíduos de ponto flutuante', () => {
  assert.equal(sumAmounts([0.1, 0.2, 33.33, 33.34]), 66.97)
})

test('parcelas no fim do mês usam o último dia do mês seguinte', () => {
  const start = parseLocalDate('2026-01-31')
  assert.equal(formatLocalDate(addMonthsClamped(start, 1)), '2026-02-28')
  assert.equal(formatLocalDate(addMonthsClamped(start, 2)), '2026-03-31')
  assert.equal(formatLocalDate(addMonthsClamped(parseLocalDate('2024-01-31'), 1)), '2024-02-29')
  assert.throws(() => parseLocalDate('2026-02-30'))
})
