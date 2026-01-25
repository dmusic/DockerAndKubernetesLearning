const key_value_store = process.env.KEY_VALUE_STORE_DB;
const keyValueUser = process.env.KEY_VALUE_STORE_USER;
const keyValuePassword = process.env.KEY_VALUE_STORE_PASSWORD;

db = db.getSiblingDB(key_value_store);  

db.createUser(
    {
        user: keyValueUser,
        pwd: keyValuePassword,
        roles: [
            { 
                role: 'readWrite',
                db: key_value_store 
            }
        ]
    }
)