const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Low, JSONFile } = require('lowdb');
const path = require('path');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 4000;

const SECRET = 'sua_chave_secreta_supersegura'; // Troque para uma chave forte em produção
const ADMIN_USER = 'admin';
const ADMIN_PASS = '123456';

// Middlewares
app.use(cors());
app.use(bodyParser.json());

// Middleware para proteger rotas
function authMiddleware(req, res, next) {
  if (req.path === '/api/login') return next();
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Token ausente' });
  const token = auth.split(' ')[1];
  try {
    jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
}

app.use(authMiddleware);

// Configuração do banco de dados (arquivo JSON)
const file = path.join(__dirname, 'db.json');
const adapter = new JSONFile(file);
const db = new Low(adapter);

// Dados padrão
const defaultData = {
  header: { logo: '', titulo: '', links: [{ label: '', url: '' }] },
  hero: { title: '', subtitle: '', stats: [{ number: '', label: '' }] },
  sobre: { title: '', paragraphs: [''], features: [{ title: '', description: '' }] },
  servicos: [{ title: '', description: '', features: [''] }],
  projetos: [{ title: '', description: '', image: '', tags: [''], metrics: [{ key: '', value: '' }] }],
  depoimentos: [{ name: '', position: '', company: '', content: '', rating: 5, avatar: '' }],
  footer: {
    text: '',
    contacts: [ { type: 'email', value: '' }, { type: 'phone', value: '' }, { type: 'address', value: '' } ],
    socials: [{ name: '', href: '' }],
    services: [''],
    companyLinks: ['']
  }
};

// Inicializar o banco de dados
async function initDB() {
  await db.read();
  db.data = db.data || defaultData;
  await db.write();
}

initDB();

// Rotas GET para cada seção
app.get('/api/:section', async (req, res) => {
  await db.read();
  const section = req.params.section;
  if (db.data[section] !== undefined) {
    res.json(db.data[section]);
  } else {
    res.status(404).json({ error: 'Seção não encontrada' });
  }
});

// Rotas PUT para atualizar cada seção
app.put('/api/:section', async (req, res) => {
  await db.read();
  const section = req.params.section;
  if (db.data[section] !== undefined) {
    db.data[section] = req.body;
    await db.write();
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Seção não encontrada' });
  }
});

// Rota para obter todas as seções de uma vez
app.get('/api', async (req, res) => {
  await db.read();
  res.json(db.data);
});

// Rota para atualizar todas as seções de uma vez
app.put('/api', async (req, res) => {
  await db.read();
  db.data = { ...db.data, ...req.body };
  await db.write();
  res.json({ success: true });
});

// Conexão com MongoDB Railway
mongoose.connect('mongodb://mongo:SVzgKbblZZglrtBqcIvOaxUkXdGoakEj@metro.proxy.rlwy.net:15495/admins', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const userSchema = new mongoose.Schema({
  user: { type: String, required: true, unique: true },
  pass: { type: String, required: true },
  role: { type: String, default: 'admin' }
});
const User = mongoose.model('User', userSchema);

// Rota para criar admin (primeiro acesso)
app.post('/api/admins', async (req, res) => {
  const { user, pass } = req.body;
  if (!user || !pass) return res.status(400).json({ error: 'Usuário e senha obrigatórios' });
  try {
    const exists = await User.findOne({ user });
    if (exists) return res.status(409).json({ error: 'Usuário já existe' });
    const newUser = await User.create({ user, pass });
    res.json({ success: true, user: newUser.user });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao criar admin' });
  }
});

// Rota de login usando MongoDB
app.post('/api/login', async (req, res) => {
  const { user, pass } = req.body;
  const found = await User.findOne({ user, pass });
  if (found) {
    const token = jwt.sign({ user: found.user, role: found.role }, SECRET, { expiresIn: '2h' });
    res.json({ token });
  } else {
    res.status(401).json({ error: 'Usuário ou senha inválidos' });
  }
});

app.listen(PORT, () => {
  console.log(`Backend rodando em http://localhost:${PORT}`);
}); 