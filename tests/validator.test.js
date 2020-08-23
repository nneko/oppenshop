const validator = require('../utilities/validator')
const usermodel = require('../models/user')

test('validator isNotNull undefined object returns false', () => {
    expect(validator.isNotNull(undefined)).toBe(false)
})

test('validator isNotNull empty string object returns false', () => {
    expect(validator.isNotNull("")).toBe(false)
})

test('validator isNotNull zero returns false', () => {
    expect(validator.isNotNull(0)).toBe(false)
})

test('validator isNotNull non zero negative number returns true', () => {
    expect(validator.isNotNull(-1)).toBe(true)
})

test('validator isNotNull non zero positive number returns true', () => {
    expect(validator.isNotNull(1)).toBe(true)
})

test('validator isNotNull null value returns false', () => {
    expect(validator.isNotNull(null)).toBe(false)
})

test('validator isNotNull object returns true', () => {
    expect(validator.isNotNull({})).toBe(true)
})

test('validator isNotNull empty array [] returns true', () => {
    expect(validator.isNotNull([])).toBe(true)
})

test('validator isEmpty undefined returns true', () => {
    expect(validator.isEmpty(undefined)).toBe(true)
})

test('validator isEmpty null returns true', () => {
    expect(validator.isEmpty(null)).toBe(true)
})

test('validator isEmpty empty string "" returns true', () => {
    expect(validator.isEmpty("")).toBe(true)
})

test('validator isEmpty empty array [] returns true', () => {
    expect(validator.isEmpty([])).toBe(true)
})

test('validator isEmpty non zero number returns false', () => {
    expect(validator.isEmpty(1)).toBe(false)
})

test('validator isEmpty non empty string returns false', () => {
    expect(validator.isEmpty(".")).toBe(false)
})

test('validator isEmailAddress check on plain string without @ returns false', () => {
    expect(validator.isEmailAddress('test email with @')).toBe(false)
})

test('validator isEmailAddress check for standard email address returns true', () => {
    expect(validator.isEmailAddress('test@example.com')).toBe(true)
})