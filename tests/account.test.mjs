import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeVehiclePlate, validVehiclePlate } from '../src/account.js'

test('vehicle plate accepts normalized Mercosul and older seven-character formats', () => {
  assert.equal(normalizeVehiclePlate('abc-1d23'), 'ABC1D23')
  assert.equal(validVehiclePlate('abc-1d23'), true)
  assert.equal(validVehiclePlate('ABC-1234'), true)
  assert.equal(validVehiclePlate('AB12D34'), false)
  assert.equal(validVehiclePlate('ABC1D2'), false)
})
