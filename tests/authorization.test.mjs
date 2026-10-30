import test from 'node:test'
import assert from 'node:assert/strict'
import { applicationRole } from '../src/authorization.js'

test('authorization never trusts user-editable metadata or grants unknown roles ownership', () => {
  assert.equal(applicationRole({ user: { user_metadata: { account_type: 'owner' } } }, true), 'customer')
  assert.equal(applicationRole({ user: { app_metadata: { role: 'invalid' } } }, true), null)
  assert.equal(applicationRole({ user: { app_metadata: { role: 'motoboy' } } }, true), 'motoboy')
  assert.equal(applicationRole({ user: { app_metadata: { role: 'owner' } } }, true), 'owner')
  assert.equal(applicationRole(null, true), null)
  assert.equal(applicationRole(null, false), null)
  assert.equal(applicationRole(null, false, true), 'owner')
})
