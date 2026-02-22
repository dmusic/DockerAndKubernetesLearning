const keyValueDb  = process.env.KEY_VALUE_DB;
const keyValueUser = process.env.KEY_VALUE_USER;
const keyValuePassword = process.env.KEY_VALUE_PASSWORD;

console.log(`Creating user '${keyValueUser}' with access to database '${keyValueDb}'`);
db = db.getSiblingDB(keyValueDb);

db.createUser({
  user: keyValueUser,
  pwd: keyValuePassword,
  roles: [{ role: "readWrite", db: keyValueDb }],
});