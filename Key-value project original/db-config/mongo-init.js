const keyValueDb = process.env.KEY_VALUE_STORE_DB;
const keyValueUser = process.env.KEY_VALUE_STORE_USER;
const keyValuePassword = process.env.KEY_VALUE_STORE_PASSWORD;

db = db.getSiblingDB(keyValueDb);  

db.createUser(
    {
        user: keyValueUser,
        pwd: keyValuePassword,
        roles: [
            { 
                role: 'readWrite',
                db: keyValueDb 
            }
        ]
    }
)