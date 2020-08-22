const validator = require('../utilities/validator')
const usermodel = require('../models/user')

test('validator isNotNull undefined object returns false', () => {
    expect(validator.isNotNull(undefined)).toBe(false)
})

test('validator isNotNull empty string object returns false', () => {
    expect(validator.isNotNull("")).toBe(false)
})

test('validator isNotNull null value returns false', () => {
    expect(validator.isNotNull(null)).toBe(false)
})

test('validator isNotNull object returns true', () => {
    expect(validator.isNotNull({})).toBe(true)
})

test('validator isEmailAddress check on plain string without @ returns false', () => {
    expect(validator.isEmailAddress('test email with @')).toBe(false)
})

test('validator isEmailAddress check for standard email address returns true', () => {
    expect(validator.isEmailAddress('test@example.com')).toBe(true)
})