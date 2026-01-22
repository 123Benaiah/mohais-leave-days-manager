const crypto = require('crypto');

// Generate a cryptographically secure random string
const jwtSecret = crypto.randomBytes(64).toString('hex');

console.log('NEW JWT_SECRET (add to .env file):');
console.log('JWT_SECRET=' + jwtSecret);
console.log('\n');
console.log('Add this to your .env file and replace the old JWT_SECRET line:');
console.log('--------------------------------------------------------------');
console.log(`JWT_SECRET=${jwtSecret}`);
console.log('--------------------------------------------------------------');
