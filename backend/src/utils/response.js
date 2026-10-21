export const fail = (res, message, status = 400, data) => res.status(status).json({ success: false, message, data });

export const asArray = value =>
  Array.isArray(value) ? value : typeof value === 'string' ? JSON.parse(value) : [];

export const find = (people, identifier) =>
  people.find(person => person.email === identifier || person.mobile === identifier);
