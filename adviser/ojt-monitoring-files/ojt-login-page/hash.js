// THIS IS FOR MANUALLY HASHING STRING INPUTSS (to run just node hash.js IN CMD)
// $2b$10$nD88njI.gqDm3qLFoI3fZeLDP5zZH9GU7rVeguEqYb4WQpdjZIQ/2 (sample hashed password) == intern1pass

const bcrypt = require('bcrypt');
const saltRounds = 10; // usual salt rounds used in the algorithm is 10

function hashPassword(passwordNiMartel) {
    return new Promise((resolve, reject) => {
        bcrypt.hash(passwordNiMartel, saltRounds, (err, hashedPassword) => {
            if (err) {
                reject(err);
            } else {
                resolve(hashedPassword);
            }
        });
    });
}

const passwordNiMartel = 'intern2pass';

hashPassword(passwordNiMartel)
    .then((hashedPassword) => {
        console.log('Hashed Password:', hashedPassword);

    })
    .catch((error) => {
        console.error('Error hashing password:', error);
    });