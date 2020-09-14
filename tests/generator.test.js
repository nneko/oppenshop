const generator = require('../utilities/generator')

test('generator objectFieldsToString string returns object', () => {
    expect(generator.parseJsonToObject('{"result":true, "count":42}')).toStrictEqual({ result: true, count: 42 })
})

test('generator objectFieldsToString string returns empty object', () => {
    expect(generator.parseJsonToObject('[1, 2, 3, 4,]')).toStrictEqual({})
})

test('generator hash string returns object', () => {
    let tmp = generator.salt('testing...')
    expect(generator.hash('test',tmp)).not.toBeNull()
})

test('generator hash string (no salt) returns string', () => {
    expect(generator.hash('test')).not.toBeNull()
})

test('generator hash string empty returns false', () => {
    expect(generator.hash('')).toBe(false)
})

test('generator salt string returns string', () => {
    expect(generator.salt('test')).not.toBeNull()
})

test('generator hash string empty returns false', () => {
    expect(generator.salt('')).toBe(false)
})

test('generator uuid returns string', () => {
    expect(generator.uuid()).not.toBeNull()
})

/*test('generator uuidv4 returns string', () => {
    expect(generator.uuidv4()).not.toBeNull()
})*/

test('generator randomString string  returns string', () => {
    expect(generator.randomString('test')).not.toBeNull()
})

test('generator randomString string empty returns false', () => {
    expect(generator.randomString('')).toBe(false)
})

test('generator MIMEType string  returns string', () => {
    expect(generator.MIMEType('test')).not.toBeNull()
})

test('generator MIMEType .json  returns application/json', () => {
    expect(generator.MIMEType('.json')).toBe('application/json')
})

test('generator MIMEType .html  returns application/json', () => {
    expect(generator.MIMEType('.html')).toBe('text/html')
})

test('generator formattedAddress address object  returns empty string', () => {
    expect(generator.formattedAddress({})).toBe("")
})

test('generator formattedAddress address object  returns string', () => {
    let addr = {
      streetAddress: 'streetAddress',
      locality: 'locality',
      region: 'region',
      postalCode: 'postalCode',
      country: 'country'
    }
    expect(generator.formattedAddress(addr)).not.toBeNull()
})

test('generator formattedAddress address object formattng returns string specific', () => {
    let addr = {
      streetAddress: 'streetAddress',
      locality: 'locality',
      region: 'region',
      postalCode: 'postalCode',
      country: 'country'
    }
    expect(generator.formattedAddress(addr)).toBe(''.concat(addr.streetAddress + '\n' + addr.locality + ', ' + addr.region + ' ' + addr.postalCode + ' ' + addr.country))
})

test('generator getField string  returns null', () => {
    expect(generator.getField(null)).toBeNull()
})

test('generator getField tmp object  returns specified value', () => {
    let tmp = [{value:'email1'},{value:'email2'},{value:'email3'}]
    expect(generator.getField(tmp,'email3')).toStrictEqual({value:'email3'})
})

test('generator getPrimaryField string  returns null', () => {
    expect(generator.getPrimaryField(null)).toBeNull()
})

test('generator getPrimaryField tmp object  returns specified value', () => {
    let tmp = [{value:'email1'},{value:'email2',primary: true},{value:'email3'}]
    expect(generator.getPrimaryField(tmp)).toStrictEqual({value:'email2',primary: true})
})

test('generator removePrimaryFields string  returns null', () => {
    expect(generator.removePrimaryFields(null)).toBeNull()
})

test('generator removePrimaryFields tmp object  returns specified value', () => {
    let tmp = [{value:'email1'},{value:'email2',primary: true},{value:'email3'}]
    expect(generator.removePrimaryFields(tmp)).toStrictEqual([{value:'email1'},{value:'email2'},{value:'email3'}])
})

test('generator removeFields string  returns empty array', () => {
    expect(generator.removeFields(null)).toStrictEqual([])
})

test('generator removeFields tmp object  returns specified value', () => {
    let tmp = [{value:'email1'},{value:'email2',primary: true},{value:'email3'}]
    expect(generator.removeFields(tmp,'email1')).toStrictEqual([{value:'email2',primary: true},{value:'email3'}])
})

test('generator removeAddressFields string  returns null', () => {
    expect(generator.removeAddressFields(null)).toBeNull()
})

/*test('generator removePrimaryFields tmp object  returns specified value', () => {
    let tmp = [{value:'email1'},{value:'email2',primary: true},{value:'email3'}]
    expect(generator.removeAddressFields(tmp)).toStrictEqual([{value:'email1'},{value:'email2'},{value:'email3'}])
})*/

/*test('generator roundNumber string  returns specified value', () => {
    expect(generator.roundNumber('20','55')).toStrictEqual(20.55)
})*/
