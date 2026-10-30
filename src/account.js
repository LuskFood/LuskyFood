export const normalizeVehiclePlate = value => String(value || '').toUpperCase().replace(/[^A-Z0-9]/g,'')
export const validVehiclePlate = value => /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(normalizeVehiclePlate(value))
