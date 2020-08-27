const express = require('express'),
    app = express(),
    bodyParser = require('body-parser'),
    jwt = require('jsonwebtoken'),
    multer = require("multer")

var cors = require('cors')

const Sequelize = require("sequelize");
const sequelize = new Sequelize("node", "root", "Koval1979", {
    dialect: "mysql",
    host: "localhost",
    define: {
        timestamps: false
    }
});
const Users = sequelize.define("users", {
    id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
    },
    name: {
        type: Sequelize.STRING,
        allowNull: false
    },
    password: {
        type: Sequelize.STRING,
        allowNull: false
    },
    keyAuth: {
        type: Sequelize.STRING,
        allowNull: false
    }
});

const FilesLoad = sequelize.define("filesLoad", {
    id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
    },
    title: {
        type: Sequelize.STRING,
        allowNull: false
    }
});

sequelize.sync().then(result => console.log(result))
    .catch(err => console.log(err));

const host = '127.0.0.1'
const port = 7000

const tokenKey = 'sdfdsfsdfdsf'

app.use(bodyParser.json())
app.use(cors())

const getKeyUser = async (keyheders) => {
    var UserReturn = null
    if (keyheders) {
        await jwt.verify(keyheders, tokenKey, async (err, payload) => {
            if (err) return null
            else if (payload) {
                const User = await Users.findOne({ where: { id: payload.id } })
                if ((!!User) && (User.keyAuth === payload.keyAuth)) {
                    UserReturn = User
                }
            }
        })
    }
    return UserReturn
}
app.use(async (req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

    req.header("Access-Control-Allow-Origin", "*");
    req.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

    req.user = await getKeyUser(req.headers.keyheders)
    next()
})


app.post('/signup', async (req, res) => {
    const keyAuth = Math.random().toString(20).substr(2, 6)
    const UserFind = await Users.findOne({ where: { name: req.body.login } })
    if (!UserFind) {
        const User = Users.build({ name: req.body.login, password: req.body.password, keyAuth });
        await User.save();
        return res.status(200).json({
            id: User.id,
            login: User.name,
            token: jwt.sign({ id: User.id, keyAuth, date: Math.floor(new Date().getTime() / 1000) + 10 * 60 }, tokenKey, { expiresIn: '6h' }),
        })
    }
    return res.status(404).json({ message: 'User is exist' })
})


app.post('/signin', async (req, res) => {
    const keyAuth = Math.random().toString(20).substr(2, 6)
    const UserFind = await Users.findOne({ where: { name: req.body.login, password: req.body.password } })
    if (!!UserFind) {
        UserFind.keyAuth = keyAuth
        UserFind.save()
        return res.status(200).json({
            id: UserFind.id,
            login: UserFind.name,
            token: jwt.sign({ id: UserFind.id, keyAuth, date: Math.floor(new Date().getTime() / 1000) + 10 * 60 }, tokenKey, { expiresIn: '6h' }),
        })
    }
    return res.status(200).json({ message: 'User is exist' })
})

app.get('/info', (req, res) => {
    return res.status(200).json({ id: req.user && req.user.id })
})


app.get('/logout', async (req, res, next) => {
    const keyAuth = Math.random().toString(20).substr(2, 6)
    const UserFind = await Users.findOne({ where: { name: req.body.login, password: req.body.password } })

    if (!!UserFind) {
        UserFind.keyAuth = keyAuth
        UserFind.save()
    }
    res.send('OK');
})

const storageConfig = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads");
    },
    filename: (req, file, cb) => {
        cb(null, Math.random().toString(20).substr(2, 6));
    }
});

app.use(express.static(__dirname));

app.use(multer({ storage: storageConfig }).single("filedata"));
app.post("/upload", async function (req, res, next) {
    const User = await getKeyUser(req.body.keyheders);
    if (User) {
        let filedata = req.file;
        if (!filedata)
            res.send("error load");
        else {
            const File = FilesLoad.build({ title: JSON.stringify(filedata) });
            await File.save();
            res.json({ ...filedata, ... { id: File.id } });
        }

    } else res.send("error no  user");
});

app.get("/file/list", async (req, res, next) => {
    if (req.user) {
        const Files = await FilesLoad.findAll()
        res.json(Files);
    } else res.send("error no  user");
});

app.get("/file/:id", async (req, res, next) => {
    if (req.user) {
        const File = await FilesLoad.findOne({ where: { id: req.params.id } })
        console.log()
        res.json(JSON.parse(File.title));
    } else res.send("error no  user");
});

app.get("/file/delete/:id", async (req, res, next) => {
    if (req.user) {
        const File = await FilesLoad.findOne({ where: { id: req.params.id } })
        File && File.destroy()
        res.send("Del");
    } else res.send("error no  user");
});

app.get("/file/download/:id", async (req, res, next) => {
    if (req.user) {
        const File = await FilesLoad.findOne({ where: { id: req.params.id } })
        if (File) {
            const SettingFile = JSON.parse(File.title)
            console.log('SettingFile', SettingFile)
            res.download(SettingFile.path, SettingFile.originalname);
        } else res.send("no file");
    } else res.send("error no  user");
});

app.get("/test", async (req, res, next) => {
    res.end("OK ");
});

app.listen(port, host, () => console.log(`Server listens http://${host}:${port}`))