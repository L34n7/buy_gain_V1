import bcrypt from "bcryptjs";

const senha = "teste123";
const hash = bcrypt.hashSync(senha, 10);

console.log(hash);


/*
-- Rode no terminal:
node gerar-hash.js

-- Update:
UPDATE users
SET password = 'HASH_AQUI'
WHERE id = 123;
*/