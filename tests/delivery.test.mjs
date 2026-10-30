import test from 'node:test'
import assert from 'node:assert/strict'
import { addressIsComplete, distanceKm, digits, lookupCep, mapRequest, maskCep, maskCpf, maskPhone } from '../src/delivery.js'

test('masks accept digits and pasted punctuation without losing numbers', () => {
  assert.equal(maskCep('01.001-000'), '01001-000')
  assert.equal(maskPhone('11987654321'), '(11) 98765-4321')
  assert.equal(maskCpf('12345678909'), '123.456.789-09')
  assert.equal(digits('(11) 98765-4321'), '11987654321')
})

test('delivery address requires full fields and a confirmed pin', () => {
  const address = { zip_code:'01001000', street:'Praça da Sé', street_number:'1', no_number:false, district:'Sé', city:'São Paulo', state:'SP', latitude:-23.55, longitude:-46.63, pin_confirmed:true }
  assert.equal(addressIsComplete(address), true)
  assert.equal(addressIsComplete({ ...address, street_number:'' }), false)
  assert.equal(addressIsComplete({ ...address, street_number:'', no_number:true }), true)
  assert.equal(addressIsComplete({ ...address, latitude:null }), false)
  assert.equal(addressIsComplete({ ...address, pin_confirmed:false }), false)
})

test('coverage is approximate and rejects missing coordinates', () => {
  assert.equal(distanceKm({ latitude:-23.55, longitude:-46.63 }, { latitude:-23.55, longitude:-46.63 }), 0)
  assert.equal(distanceKm({ latitude:null, longitude:null }, { latitude:-23.55, longitude:-46.63 }), null)
})

test('CEP lookup keeps manual fallback on not found and outage', async () => {
  const original = globalThis.fetch
  try {
    globalThis.fetch = async () => ({ ok:true, json:async () => ({ erro:true }) })
    await assert.rejects(lookupCep('01001000'), /não encontrado/)
    globalThis.fetch = async () => ({ ok:false })
    await assert.rejects(lookupCep('01001000'), /manualmente/)
    globalThis.fetch = async () => ({ ok:true, json:async () => ({ logradouro:'Rua A', bairro:'Centro', localidade:'Cidade', uf:'SP' }) })
    assert.deepEqual(await lookupCep('01001000'), { street:'Rua A', district:'Centro', city:'Cidade', state:'SP' })
  } finally { globalThis.fetch = original }
})

test('map function reports server errors without showing success', async () => {
  const client = { functions:{ invoke:async () => ({ data:null, error:{ message:'failed', context:{ json:async () => ({ error:'Cota atingida.' }) } } }) } }
  await assert.rejects(mapRequest(client,{ action:'route' }), /Cota atingida/)
})
