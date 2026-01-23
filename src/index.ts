import express from 'express';
import cors from 'cors';
import router from './routes'; // <--- Importando o arquivo que criamos acima

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Usa as rotas com o prefixo /api
app.use('/api', router);

app.listen(PORT, () => {
  console.log(`🚀 Servidor Theris Enterprise rodando na porta ${PORT}`);
  console.log(`🔗 Acesse: http://localhost:${PORT}`);
});