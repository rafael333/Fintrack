export const parseLocalDate = (value: string): Date => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) throw new Error('Data inválida')

  const [, year, month, day] = match.map(Number)
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    throw new Error('Data inválida')
  }
  return date
}

export const formatLocalDate = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

export const addMonthsClamped = (date: Date, months: number): Date => {
  const firstDay = new Date(date.getFullYear(), date.getMonth() + months, 1)
  const lastDay = new Date(firstDay.getFullYear(), firstDay.getMonth() + 1, 0).getDate()
  return new Date(firstDay.getFullYear(), firstDay.getMonth(), Math.min(date.getDate(), lastDay))
}
