const roundCurrency = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100

export const calculateGstBreakdown = (subTotalAmount: number, gstRatePercent: number) => {
  const normalizedSubTotal = roundCurrency(subTotalAmount)
  const normalizedRate = Number.isFinite(gstRatePercent) ? Math.max(0, gstRatePercent) : 0
  const gstAmount = roundCurrency((normalizedSubTotal * normalizedRate) / 100)
  const totalAmount = roundCurrency(normalizedSubTotal + gstAmount)

  return {
    subTotalAmount: normalizedSubTotal,
    gstRate: normalizedRate,
    gstAmount,
    totalAmount,
  }
}
