const fs = require('fs');
const buf = fs.readFileSync('public/assets/grass-1.png');
console.log(buf.readUInt32BE(16) + 'x' + buf.readUInt32BE(20));
