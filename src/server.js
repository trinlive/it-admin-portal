require('dotenv').config();
const express = require('express');
const ActiveDirectory = require('activedirectory2');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

const config = {
    url: process.env.AD_URL || 'ldap://localhost', // วิ่งหา Samba ในเครื่องเดียวกัน
    baseDN: process.env.AD_BASE_DN,
    username: process.env.AD_USER,
    password: process.env.AD_PASS,
    attributes: {
        user: ['cn', 'sAMAccountName', 'mail', 'department', 'description', 'whenCreated']
    }
};

const ad = new ActiveDirectory(config);

// หน้า Dashboard แสดงรายชื่อ User
app.get('/', (req, res) => {
    const query = '(&(objectClass=user)(objectCategory=person))';
    ad.findUsers(query, (err, users) => {
        if (err) {
            console.error('ERROR:', JSON.stringify(err));
            return res.render('index', { users: [], error: err.message });
        }
        // เรียงชื่อ A-Z
        if(users) users.sort((a, b) => (a.cn || '').localeCompare(b.cn || ''));
        res.render('index', { users: users, error: null });
    });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`🚀 IT Admin Portal running on port ${PORT}`);
});