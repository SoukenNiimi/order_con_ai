const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const sql = require('./public/sql');
const crypto = require('crypto');
const csrf = require('csurf');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const app = express();
const port = 3000;
const fs = require('fs');
let userSessions = new Map();



const secretKey = crypto.randomBytes(32).toString('hex');
app.set('view engine', 'ejs');

app.use(cookieParser());
app.use(session({
  secret: secretKey,
  resave: false, // これをfalseに変更して、同じアカウントへ複数端末でのログインを可能にする
  saveUninitialized: true,
  cookie: {
    secure: false, // HTTPSを使用していない場合はfalseに設定する必要があります。
    httpOnly: true,
    sameSite: 'lax',
  },
}));


const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // 本番環境ではHTTPSを使用
    sameSite: 'strict',
  },
  value: (req) => req.cookies['csrf-token']
});
app.use(csrfProtection);

app.use(express.static(path.join(__dirname, 'public')));


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.get('/', (req, res, next) => {
  res.redirect('/login');
});


app.get('*', (req, res, next) => {
  if (!req.session.isLoggedIn && req.path !== '/login' && req.path !== '/') {
    res.redirect('/login');
  } else {
    next();
  }
});

app.post('/login', csrfProtection, async (req, res) => {
  const { username, password } = req.body;
  console.log('Received POST request to /login:', username, password);

  try {
    const result = await sql.authenticateUser(username, password);

    if (result.status === 'success') {
      req.session.isLoggedIn = true;
      req.session.userId = await sql.getUserIdByUsername(username);
      console.log(req.session);
      res.status(200).json({ status: 'success', redirect: '/setting' });
    } else {
      res.status(401).json({ status: 'failure', message: result.message });
    }
  } catch (err) {
    console.error('データベースエラー:', err);
    res.status(500).send('エラーが発生しました');
  }
});


app.get('/login', csrfProtection, (req, res) => {
  res.cookie('csrf-token', req.csrfToken());
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});


app.post('/touroku', async (req, res) => {
  console.log("登録処理");
  const { username, password, email } = req.body;
  try {
    const result = await sql.submitForm(username, password, email);
  } catch (err) {
    console.error('データベースエラー:', err);
    res.status(500).send('エラーが発生しました');
  }
});



app.get('/menu', (req, res, next) => {
  if (!req.session.isLoggedIn) {
    res.redirect('/login');
  } else {
    res.sendFile(path.join(__dirname, 'public', 'menu.html'));
  }
});

app.get('/get-user-id', (req, res) => {
  const userId = req.session.userId;
  res.json({ userId: userId });
});

app.get('/get-current-table', (req, res) => {
  const userId = req.session.table_id;
  res.json({ table_id:table_id });
});

app.post('/add-dish', upload.single('image'), async (req, res) => {
  const { dish_name, category_id, description, price, tags } = req.body;
  const image = req.file;
  try {
    const imagePath = saveImage(req.session.userId, image);
    const result = await sql.addDish(req.session.userId, dish_name, category_id, description, imagePath, price, tags);
    if (result.status === 'success') {
      res.status(200).json({ status: 'success' });
    } else {
      res.status(500).json({ status: 'failure', message: result.message });
    }
  } catch (err) {
    console.error('データベースエラー:', err);
  }
});

app.post('/add-order', async (req, res) => {
  let orders = req.body;
  try {
    for (let order of orders) {
      await sql.addOrder(order);
    }
    res.status(200).json({ status: 'success' });
  } catch (err) {
    console.error('データベースエラー:', err);
    res.status(500).send('エラーが発生しました');
  }
});

app.get('/get-category', async (req, res) => {
  const userId = req.query.user_id;
  try {
    console.log(userId);
    const categories = await sql.getCategoriesByUserId(userId);
    res.json(categories);
  } catch (err) {
    console.error('データベースエラー:', err);
    res.status(500).send('データベースエラー');
  }
});

app.get('/get-tableNo', async (req, res) => {
  const userId = req.query.user_id;
  try {
    console.log(userId);
    const tableNo = await sql.getTableinfo(userId);
    res.json(tableNo);
  } catch (err) {
    console.error('データベースエラー:', err);
    res.status(500).send('データベースエラー');
  }
});

app.post('/table-update', async (req, res) => {//req.session.userId
  const userId = req.body.userId;
  const tableId = req.body.table_id;
  const state = req.body.state;
  let result;
  try {
    if (state == "start") {
      result = await sql.updateTableflg_start(tableId, userId);
    } else if (state == "end") {
      result = await sql.updateTableflg_end(tableId, userId);
    } else {
      return res.status(400).send('無効なステートパラメータ');
    }
    res.status(200).json({message: 'Operation successful', data: result});
  } catch (err) {
    console.error('データベースエラー:', err);
    res.status(500).send('データベースエラー');
  }
});



app.get('/get-dishes', async (req, res) => {
  const userId = req.session.userId;
  try {
    const dishes = await sql.getDishesByUserId(userId);
    res.json(dishes);
  } catch (err) {
    console.error('データベースエラー:', err);
    res.status(500).send('データベースエラー');
  }
});


app.get('/get-history', async (req, res) => {
  const userId = req.session.userId;
  try {
    const order = await sql.get_history(userId);
    res.json(order);
  } catch (err) {
    console.error('データベースエラー:', err);
    res.status(500).send('データベースエラー');
  }
});

function saveImage(userId, file) {
  const userDir = path.join('public/img', String(userId));
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true });
  }

  const timestamp = new Date().getTime();
  const hash = crypto.createHash('md5').update(String(timestamp)).digest('hex');
  const imagePath = path.join(userDir, `${hash}.jpg`);
  const dbPath = path.join('img', String(userId), `${hash}.jpg`);

  fs.renameSync(file.path, imagePath);

  return dbPath;
}


// ログインしていないとアクセスできないようにする
app.get('/touroku', (req, res, next) => {
  console.log(req.session);
  if (!req.session.isLoggedIn) {
    res.redirect('/login');
  } else {
    res.sendFile(path.join(__dirname, 'public', 'user_touroku.html'));
  }
});

app.get('/setting', (req, res, next) => {
  if (!req.session.isLoggedIn) {
    res.redirect('/login');
  } else {
    res.sendFile(path.join(__dirname, 'public', 'setting.html'));
  }
});

app.get('/live2d', (req, res, next) => {
  if (!req.session.isLoggedIn) {
    res.redirect('/login');
  } else {
    res.sendFile(path.join(__dirname, 'public', 'live2d.html'));
  }
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});

