"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const structureController = __importStar(require("./controllers/structureController"));
const structureSync_1 = require("./services/structureSync"); // Import sync service
// Slack
const slackService_1 = require("./services/slackService");
dotenv_1.default.config();
const app = (0, express_1.default)();
const prisma = new client_1.PrismaClient();
// Auto-sync structure on startup
(0, structureSync_1.syncStructureFromUsers)();
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
app.get('/api/structure', structureController.getStructure);
app.post('/api/structure/departments', structureController.createDepartment);
app.put('/api/structure/departments/:id', structureController.updateDepartment);
app.delete('/api/structure/departments/:id', structureController.deleteDepartment);
app.post('/api/structure/roles', structureController.createRole);
app.put('/api/structure/roles/:id', structureController.updateRole);
app.delete('/api/structure/roles/:id', structureController.deleteRole);
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
const toolController_2 = require("./controllers/toolController"); // Helper import if needed, but better to update top import
app.patch('/api/tools/:toolId/level/:oldLevelName', toolController_1.updateToolLevel);
app.delete('/api/tools/:toolId/level/:levelName', toolController_2.deleteToolLevel);
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
