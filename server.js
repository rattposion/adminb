require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
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

// Corrigir conexão com MongoDB usando variável de ambiente e nome do banco
if (!process.env.MONGO_PUBLIC_URL || !process.env.MONGO_PUBLIC_URL.startsWith('mongodb://')) {
  throw new Error('A variável MONGO_PUBLIC_URL não está definida corretamente. Ela deve começar com "mongodb://".');
}
const mongoUrl = process.env.MONGO_PUBLIC_URL;

mongoose.connect(mongoUrl);

const userSchema = new mongoose.Schema({
  user: { type: String, required: true, unique: true },
  pass: { type: String, required: true },
  role: { type: String, default: 'admin' }
});
const User = mongoose.model('User', userSchema);

// Modelo para dados do site
const siteDataSchema = new mongoose.Schema({
  header: { logo: String, titulo: String, links: [{ label: String, url: String }] },
  hero: { title: String, subtitle: String, stats: [{ number: String, label: String }] },
  sobre: { title: String, paragraphs: [String], features: [{ title: String, description: String }] },
  servicos: [{ title: String, description: String, features: [String] }],
  projetos: [{ title: String, description: String, image: String, tags: [String], metrics: [{ key: String, value: String }] }],
  depoimentos: [{ name: String, position: String, company: String, content: String, rating: Number, avatar: String }],
  footer: {
    text: String,
    contacts: [{ type: { type: String }, value: String }],
    socials: [{ name: String, href: String }],
    services: [String],
    companyLinks: [String]
  }
});
const SiteData = mongoose.model('SiteData', siteDataSchema);

// Após conectar ao MongoDB, garantir que o documento principal de dados do site exista
mongoose.connection.once('open', async () => {
  try {
    let doc = await SiteData.findOne();
    if (!doc) {
      await SiteData.create({});
      console.log('Documento principal de dados do site criado automaticamente.');
    } else {
      console.log('Documento principal de dados do site já existe.');
    }
  } catch (e) {
    console.error('Erro ao garantir documento principal do site:', e);
  }
});

// GET todas as seções
app.get('/api', async (req, res) => {
  const doc = await SiteData.findOne();
  res.json(doc);
});

// PUT todas as seções
app.put('/api', async (req, res) => {
  let doc = await SiteData.findOne();
  Object.assign(doc, req.body);
  await doc.save();
  res.json({ success: true });
});

// GET seção específica
app.get('/api/:section', async (req, res) => {
  const doc = await SiteData.findOne();
  const section = req.params.section;
  if (doc[section] !== undefined) {
    res.json(doc[section]);
  } else {
    res.status(404).json({ error: 'Seção não encontrada' });
  }
});

// PUT seção específica
app.put('/api/:section', async (req, res) => {
  let doc = await SiteData.findOne();
  const section = req.params.section;
  if (doc[section] !== undefined) {
    doc[section] = req.body;
    await doc.save();
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Seção não encontrada' });
  }
});

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