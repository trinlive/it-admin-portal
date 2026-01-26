const express = require('express');
const ActiveDirectory = require('activedirectory2');
const app = express();

const config = {
    url: process.env.AD_URL || 'ldap://samba-ad',
    baseDN: process.env.AD_BASE_DN,
    username: process.env.AD_USER,
    password: process.env.AD_PASS
};

const ad = new ActiveDirectory(config);

app.get('/', (req, res) => {
    res.send('IT Admin Portal is Running! <br> Try /test-ad to check connection.');
});

app.get('/test-ad', (req, res) => {
    // ลองค้นหา User "testuser" ที่เราสร้างไว้
    ad.findUser('testuser', function(err, user) {
        if (err) {
            console.log('ERROR: ' + JSON.stringify(err));
            res.status(500).send('❌ Connection Failed: ' + err.message);
            return;
        }

        if (!user) {
            res.send('⚠️ Connection OK, but User "testuser" not found.');
        } else {
            res.send('✅ <b>Connection SUCCESS!</b><br>Found User: ' + user.sAMAccountName + '<br>DN: ' + user.dn);
        }
    });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});