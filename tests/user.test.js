const { user } = require('../models/user')
const { validator } = require('../utilities/validator')

test('validate undefined object is null', () => {
    expect(validator.isNotNull(undefined)).toBe(false)
})

test('create a new local user account', () => {

})