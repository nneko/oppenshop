const converter = require('../utilities/converter')

test('converter objectFieldsToString object returns string', () => {
    expect(converter.objectFieldsToString({user: "test@example.com", uid: 987123})).toStrictEqual({user: "test@example.com", uid: "987123"})
})

test('converter currencyAmount(USD) object returns object', async () => {
    let item = {currency: "JMD", amount: 10350.89}
    const data = await converter.currencyAmount({currency: "USD", amount: 100.00},"JMD")
    //console.log(data)
    //console.log(item)
    expect(data).toEqual(
      expect.objectContaining({
        currency: expect.any(String),
        amount: expect.any(Number)})
    )
})

test('converter currencyAmount(GBP) object returns object', async () => {
    let item = {currency: "JMD", amount: 10350.89}
    const data = await converter.currencyAmount({currency: "GBP", amount: 100.00},"JMD")
    //console.log(data)
    //console.log(item)
    expect(data).toEqual(
      expect.objectContaining({
        currency: expect.any(String),
        amount: expect.any(Number)})
    )
})

test('converter currencyAmount(EUR) object returns object', async () => {
    let item = {currency: "JMD", amount: 10350.89}
    const data = await converter.currencyAmount({currency: "EUR", amount: 100.00},"JMD")
    //console.log(data)
    //console.log(item)
    expect(data).toEqual(
      expect.objectContaining({
        currency: expect.any(String),
        amount: expect.any(Number)})
    )
})

test('converter currencyAmount(CAD) object returns object', async () => {
    let item = {currency: "JMD", amount: 10350.89}
    const data = await converter.currencyAmount({currency: "CAD", amount: 100.00},"JMD")
    //console.log(data)
    //console.log(item)
    expect(data).toEqual(
      expect.objectContaining({
        currency: expect.any(String),
        amount: expect.any(Number)})
    )
})
