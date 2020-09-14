const converter = require('../utilities/converter')

test('converter objectFieldsToString object returns string', () => {
    expect(converter.objectFieldsToString({user: "test@example.com", uid: 987123})).toStrictEqual({user: "test@example.com", uid: "987123"})
})
