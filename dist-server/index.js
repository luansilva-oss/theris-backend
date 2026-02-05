"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const client_1 = require("@prisma/client");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// --- IMPORTAÇÕES DOS CONTROLADORES ---
const solicitacaoController_1 = require("./controllers/solicitacaoController");
const authController_1 = require("./controllers/authController");
const toolController_1 = require("./controllers/toolController");
const userController_1 = require("./controllers/userController");
// NOVO: Importar o controlador de reset
const adminController_1 = require("./controllers/adminController");
// Slack
const slackService_1 = require("./services/slackService");
dotenv_1.default.config();
const app = (0, express_1.default)();
const prisma = new client_1.PrismaClient();
// --- CORS ---
app.use((0, cors_1.default)({ origin: '*', methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] }));
// ⚠️ ROTA DO SLACK
app.use('/api/slack', slackService_1.slackReceiver.router);
// --- JSON MIDDLEWARE ---
app.use(express_1.default.json());
// ============================================================
// --- ROTAS DE AUTENTICAÇÃO ---
// ============================================================
app.post('/api/login/google', authController_1.googleLogin);
app.post('/api/auth/send-mfa', authController_1.sendMfa);
app.post('/api/auth/verify-mfa', authController_1.verifyMfa);
// ============================================================
// --- ROTAS ADMINISTRATIVAS (EMERGÊNCIA) ---
// ============================================================
// Roda este link no navegador para resetar o catálogo de ferramentas
app.get('/api/admin/reset-tools', adminController_1.resetCatalog);
// ============================================================
// --- ROTAS DE DADOS ---
// ============================================================
// 1. Estrutura
app.get('/api/structure', async (req, res) => {
    try {
        const data = await prisma.department.findMany({
            include: { roles: true }
        });
        res.json(data);
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao buscar estrutura.' });
    }
});
// 2. Ferramentas
app.get('/api/tools', toolController_1.getTools);
app.post('/api/tools', toolController_1.createTool);
app.put('/api/tools/:id', toolController_1.updateTool); // Atualizar ferramenta (Grupo, Owner, Níveis)
app.delete('/api/tools/:id', toolController_1.deleteTool); // EXCLUIR FERRAMENTA
app.get('/api/tool-groups', toolController_1.getToolGroups);
app.post('/api/tool-groups', toolController_1.createToolGroup);
app.delete('/api/tool-groups/:id', toolController_1.deleteToolGroup);
app.post('/api/tools/:id/access', toolController_1.addToolAccess); // Adicionar/Atualizar acesso de usuário
app.delete('/api/tools/:id/access/:userId', toolController_1.removeToolAccess); // Remover acesso
app.patch('/api/tools/:toolId/access/:userId', toolController_1.updateToolAccess); // Atualizar detalhes do acesso (ex: extra)
// 3. Usuários
app.get('/api/users', userController_1.getAllUsers);
app.put('/api/users/:id', userController_1.updateUser);
// ============================================================
// --- INTEGRAÇÃO CONVENIA ---
// ============================================================
const conveniaController_1 = require("./controllers/conveniaController");
app.post('/api/webhooks/convenia', conveniaController_1.handleConveniaWebhook);
// ============================================================
// --- WORKFLOW (SOLICITAÇÕES) ---
// ============================================================
app.get('/api/solicitacoes', solicitacaoController_1.getSolicitacoes);
app.post('/api/solicitacoes', solicitacaoController_1.createSolicitacao);
app.patch('/api/solicitacoes/:id', solicitacaoController_1.updateSolicitacao);
// ============================================================
// --- SERVIR FRONTEND ---
// ============================================================
const frontendPath = path_1.default.resolve(__dirname, '../dist');
app.use(express_1.default.static(frontendPath));
app.get('*', (req, res) => {
    res.sendFile(path_1.default.join(frontendPath, 'index.html'));
});
// --- START ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Theris Backend rodando na porta ${PORT}`);
});
