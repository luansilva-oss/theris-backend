export interface DefaultToolAccess {
    toolName: string;
    level: string;
    description: string;
    loginUrl: string;
}

export const JOB_TITLE_DEFAULTS: Record<string, DefaultToolAccess[]> = {
    // --- Tecnologia e Segurança (SI) ---
    'Gestor de Segurança da Informação': [
        { toolName: 'AWS', level: 'Admin da AWS', description: 'Plataforma de nuvem principal.', loginUrl: 'https://aws.amazon.com/' },
        { toolName: 'GCP', level: 'Owner do GCP', description: 'Google Cloud Platform.', loginUrl: 'https://console.cloud.google.com/' },
        { toolName: 'Hik-Connect', level: 'Admin', description: 'Sistema de monitoramento por câmeras.', loginUrl: 'https://www.hik-connect.com/' },
        { toolName: 'JumpCloud', level: 'Administrador With Billing', description: 'Diretório de usuários e SSO.', loginUrl: 'https://console.jumpcloud.com/' }
    ],
    'Analista de Segurança da Informação e Infraestrutura': [
        { toolName: 'Aplicação 3C+', level: 'Admin nível 2', description: 'Sistema principal da 3C+.', loginUrl: 'https://app.3cplus.com.br' },
        { toolName: 'Hik-Connect', level: 'Admin', description: 'Monitoramento por câmeras.', loginUrl: 'https://www.hik-connect.com/' },
        { toolName: 'JumpCloud', level: 'Administrador With Billing', description: 'Diretório de usuários.', loginUrl: 'https://console.jumpcloud.com/' },
        { toolName: 'n8n', level: 'Membro', description: 'Automação de fluxos de trabalho.', loginUrl: 'https://n8n.io/' }
    ],
    'Analista de Custos': [
        { toolName: 'Aplicação 3C+', level: 'Admin nível 2', description: 'Sistema principal.', loginUrl: 'https://app.3cplus.com.br' },
        { toolName: 'GCP', level: 'Owner do GCP', description: 'Google Cloud Platform.', loginUrl: 'https://console.cloud.google.com/' },
        { toolName: 'HubSpot', level: 'Atendimento ao Cliente', description: 'Gestão de CRM e clientes.', loginUrl: 'https://app.hubspot.com/' },
        { toolName: 'Router', level: 'Equipe Telecom', description: 'Gestão de roteamento de chamadas.', loginUrl: 'https://router.3cplus.com.br' },
        { toolName: 'Vindi', level: 'Gestor', description: 'Plataforma de pagamentos recorrentes.', loginUrl: 'https://vindi.com.br' }
    ],
    'DevOps': [
        { toolName: 'Aplicação Evolux', level: 'Developer Group', description: 'Sistema de telefonia IP.', loginUrl: 'https://evolux.io/' },
        { toolName: 'AWS', level: 'Admin da AWS', description: 'Infraestrutura de nuvem.', loginUrl: 'https://aws.amazon.com/' },
        { toolName: 'ClickUp', level: 'Membro', description: 'Gestão de tarefas e projetos.', loginUrl: 'https://app.clickup.com/' },
        { toolName: 'GitLab', level: 'Administrador', description: 'Versionamento de código e CI/CD.', loginUrl: 'https://gitlab.com/' },
        { toolName: 'Aplicação 3C+', level: 'Admin nível 3', description: 'Sistema principal.', loginUrl: 'https://app.3cplus.com.br' }
    ],

    // --- Board (BO) ---
    'CEO': [
        { toolName: 'Aplicação 3C+', level: 'Admin nível 3', description: 'Sistema principal.', loginUrl: 'https://app.3cplus.com.br' },
        { toolName: 'ClickUp', level: 'Admin', description: 'Gestão de projetos.', loginUrl: 'https://app.clickup.com/' },
        { toolName: 'Convenia', level: 'Owner', description: 'Gestão de RH e DP.', loginUrl: 'https://app.convenia.com.br/' },
        { toolName: 'Hik-Connect', level: 'Admin', description: 'Segurança predial.', loginUrl: 'https://www.hik-connect.com/' },
        { toolName: 'Oracle – Next Suit', level: 'Executivo', description: 'ERP corporativo.', loginUrl: 'https://www.oracle.com/' }
    ],
    'CMO': [
        { toolName: 'ChatGPT', level: 'Proprietário', description: 'IA para conteúdo.', loginUrl: 'https://chat.openai.com/' },
        { toolName: 'ClickUp', level: 'Membro', description: 'Gestão de tarefas.', loginUrl: 'https://app.clickup.com/' },
        { toolName: 'GCP', level: 'Usuário Padrão', description: 'Google Cloud.', loginUrl: 'https://console.cloud.google.com/' },
        { toolName: 'Hik-Connect', level: 'Admin', description: 'Segurança.', loginUrl: 'https://www.hik-connect.com/' },
        { toolName: 'HubSpot', level: 'Administrador', description: 'Marketing e CRM.', loginUrl: 'https://app.hubspot.com/' }
    ],
    'CPOX': [
        { toolName: 'ClickUp', level: 'Admin', description: 'Gestão de projetos.', loginUrl: 'https://app.clickup.com/' },
        { toolName: 'Dizify', level: 'Administrador', description: 'Plataforma de marketing.', loginUrl: 'https://dizify.com.br/' },
        { toolName: 'Figma', level: 'Nível Full', description: 'Design de produto.', loginUrl: 'https://www.figma.com/' },
        { toolName: 'Hik-Connect', level: 'Admin', description: 'Segurança.', loginUrl: 'https://www.hik-connect.com/' },
        { toolName: 'META', level: 'Acesso Parcial - Básico', description: 'Gestão de anúncios Facebook/Instagram.', loginUrl: 'https://business.facebook.com/' }
    ],
    'CPO': [
        { toolName: 'ClickUp', level: 'Membro', description: 'Gestão de tarefas.', loginUrl: 'https://app.clickup.com/' },
        { toolName: 'Convenia', level: 'Owner', description: 'RH e DP.', loginUrl: 'https://app.convenia.com.br/' },
        { toolName: 'Dizify', level: 'Administrador', description: 'Plataforma de marketing.', loginUrl: 'https://dizify.com.br/' }
    ],
    'COO': [
        { toolName: 'Aplicação 3C+', level: 'Admin nível 2', description: 'Sistema principal.', loginUrl: 'https://app.3cplus.com.br' },
        { toolName: 'ChatGPT', level: 'Membro', description: 'IA para suporte.', loginUrl: 'https://chat.openai.com/' },
        { toolName: 'ClickUp', level: 'Admin', description: 'Gestão de projetos.', loginUrl: 'https://app.clickup.com/' },
        { toolName: 'HubSpot', level: 'Administrador', description: 'CRM e Vendas.', loginUrl: 'https://app.hubspot.com/' }
    ],
    'CTO': [
        { toolName: 'AWS', level: 'Admin', description: 'Cloud Infra.', loginUrl: 'https://aws.amazon.com/' },
        { toolName: 'GitLab', level: 'Admin', description: 'Código e DevOps.', loginUrl: 'https://gitlab.com/' },
        { toolName: 'HubSpot', level: 'Personalizado', description: 'CRM.', loginUrl: 'https://app.hubspot.com/' },
        { toolName: 'JumpCloud', level: 'Admin', description: 'Identidade.', loginUrl: 'https://console.jumpcloud.com/' },
        { toolName: 'Vindi', level: 'Admin', description: 'Financeiro.', loginUrl: 'https://vindi.com.br' },
        { toolName: 'ClickUp', level: 'Admin', description: 'Projetos.', loginUrl: 'https://app.clickup.com/' }
    ],
    'CFO': [
        { toolName: 'ChatGPT', level: 'Membro', description: 'IA.', loginUrl: 'https://chat.openai.com/' },
        { toolName: 'ClickSign', level: 'Membro', description: 'Assinaturas digitais.', loginUrl: 'https://www.clicksign.com/' },
        { toolName: 'Focus', level: 'Administrador', description: 'Gestão e processos.', loginUrl: 'https://focus.com.br/' },
        { toolName: 'Oracle – Next Suit', level: 'Administrador', description: 'ERP Financeiro.', loginUrl: 'https://www.oracle.com/' }
    ],
    'CSO': [
        { toolName: 'Aplicação Evolux', level: 'Tenant support', description: 'Apoio técnico evolux.', loginUrl: 'https://evolux.io/' },
        { toolName: 'ChatGPT', level: 'Membro', description: 'IA.', loginUrl: 'https://chat.openai.com/' },
        { toolName: 'ClickUp', level: 'Membro', description: 'Tarefas.', loginUrl: 'https://app.clickup.com/' },
        { toolName: 'Hik-Connect', level: 'Admin', description: 'Segurança.', loginUrl: 'https://www.hik-connect.com/' }
    ],

    // --- Administrativo (AD) ---
    'Analista Contábil': [
        { toolName: 'Oracle – Next Suit', level: 'Analista Fiscal', description: 'ERP Contábil/Fiscal.', loginUrl: 'https://www.oracle.com/' }
    ],
    'Assistente Jurídico': [
        { toolName: 'ClickSign', level: 'Membro', description: 'Assinaturas digitais.', loginUrl: 'https://www.clicksign.com/' }
    ],
    'Analista de Departamento Pessoal': [
        { toolName: 'ClickSign', level: 'Membro', description: 'Assinaturas digitais.', loginUrl: 'https://www.clicksign.com/' },
        { toolName: 'Convenia', level: 'Owner', description: 'Gestão de RH.', loginUrl: 'https://app.convenia.com.br/' }
    ],
    'Assistente Financeiro': [
        { toolName: 'ClickUp', level: 'Membro', description: 'Pautas financeiras.', loginUrl: 'https://app.clickup.com/' },
        { toolName: 'ClickSign', level: 'Admin', description: 'Gestão de assinaturas.', loginUrl: 'https://www.clicksign.com/' },
        { toolName: 'Focus', level: 'Admin', description: 'Gestão.', loginUrl: 'https://focus.com.br/' },
        { toolName: 'Oracle – Next Suit', level: 'Analista Fiscal', description: 'ERP.', loginUrl: 'https://www.oracle.com/' },
        { toolName: 'Vindi', level: 'Admin', description: 'Pagamentos.', loginUrl: 'https://vindi.com.br' }
    ],

    // --- Comercial (CO) ---
    'Líder de Vendas PME': [
        { toolName: 'Aplicação 3C+', level: 'Admin nível 3', description: 'Sistema principal.', loginUrl: 'https://app.3cplus.com.br' },
        { toolName: 'HubSpot', level: 'Líder Comercial', description: 'CRM de vendas.', loginUrl: 'https://app.hubspot.com/' }
    ],
    'Head Comercial': [
        { toolName: 'Aplicação 3C+', level: 'Admin nível 3', description: 'Sistema principal.', loginUrl: 'https://app.3cplus.com.br' },
        { toolName: 'HubSpot', level: 'Líder Comercial', description: 'CRM.', loginUrl: 'https://app.hubspot.com/' }
    ],
    'Closer': [
        { toolName: 'Aplicação 3C+', level: 'Admin nível 2', description: 'Sistema 3C+.', loginUrl: 'https://app.3cplus.com.br' },
        { toolName: 'HubSpot', level: 'Closer/Analista', description: 'Gestão de leads.', loginUrl: 'https://app.hubspot.com/' }
    ],
    'SalesOps': [
        { toolName: 'HubSpot', level: 'Administrador', description: 'Gestão total do CRM.', loginUrl: 'https://app.hubspot.com/' },
        { toolName: 'Vindi', level: 'Gestor', description: 'Faturamento.', loginUrl: 'https://vindi.com.br' }
    ],

    // --- Atendimento (AT) ---
    'Líder de Atendimento ao Cliente': [
        { toolName: 'Aplicação 3C+', level: 'Admin nível 2', description: 'Apoio ao cliente.', loginUrl: 'https://app.3cplus.com.br' },
        { toolName: 'HubSpot', level: 'Administrador', description: 'Gestão de tickets.', loginUrl: 'https://app.hubspot.com/' },
        { toolName: 'Vindi', level: 'Administrador', description: 'Financeiro.', loginUrl: 'https://vindi.com.br' }
    ],
    'Customer Success': [
        { toolName: 'Aplicação 3C+', level: 'Admin nível 2', description: 'Painel 3C+.', loginUrl: 'https://app.3cplus.com.br' },
        { toolName: 'HubSpot', level: 'Atendimento ao Cliente', description: 'CRM.', loginUrl: 'https://app.hubspot.com/' },
        { toolName: 'Vindi', level: 'Gestor', description: 'Faturamento recorrente.', loginUrl: 'https://vindi.com.br' }
    ],
    'Analista de Automações': [
        { toolName: 'AWS', level: 'SysAdmin', description: 'Cloud.', loginUrl: 'https://aws.amazon.com/' },
        { toolName: 'n8n', level: 'Membro', description: 'Automações.', loginUrl: 'https://n8n.io/' },
        { toolName: 'GitLab', level: 'Regular', description: 'Código.', loginUrl: 'https://gitlab.com/' }
    ],

    // --- Marketing (MK) ---
    'Líder de Marketing': [
        { toolName: 'HubSpot', level: 'Administrador', description: 'Marketing Cloud/CRM.', loginUrl: 'https://app.hubspot.com/' },
        { toolName: 'META', level: 'Business manager', description: 'Anúncios.', loginUrl: 'https://business.facebook.com/' }
    ],
    'Designer': [
        { toolName: 'Figma', level: 'Collab', description: 'Designs e Protótipos.', loginUrl: 'https://www.figma.com/' },
        { toolName: 'META', level: 'Acesso Parcial', description: 'Anúncios.', loginUrl: ' бизнес.facebook.com/' }
    ],

    // --- P&P (PC) ---
    'Analista de Pessoas e Performance': [
        { toolName: 'ClickUp', level: 'Admin', description: 'Projetos de RH.', loginUrl: 'https://app.clickup.com/' },
        { toolName: 'Convenia', level: 'Pessoas e Cultura', description: 'Plataforma de RH.', loginUrl: 'https://app.convenia.com.br/' },
        { toolName: 'JumpCloud', level: 'Manager', description: 'Diretório e Onboarding.', loginUrl: 'https://console.jumpcloud.com/' }
    ],
    'Porteiro': [
        { toolName: 'Hik-Connect', level: 'Admin', description: 'Gestão de acesso físico.', loginUrl: 'https://www.hik-connect.com/' }
    ],

    // --- Produto (PD) e Desenvolvimento ---
    'Desenvolvedor Full Stack': [
        { toolName: 'Aplicação 3C+', level: 'Admin nível 3', description: 'Desenvolvimento e Debug.', loginUrl: 'https://app.3cplus.com.br' },
        { toolName: 'GCP', level: 'Usuário Padrão', description: 'Nuvem.', loginUrl: 'https://console.cloud.google.com/' },
        { toolName: 'GitLab', level: 'Regular', description: 'Código e Versionamento.', loginUrl: 'https://gitlab.com/' }
    ],
    'Tech Lead': [
        { toolName: 'GitLab', level: 'Administrador', description: 'Gestão de repositórios.', loginUrl: 'https://gitlab.com/' },
        { toolName: 'AWS', level: 'Admin', description: 'Cloud.', loginUrl: 'https://aws.amazon.com/' },
        { toolName: 'Figma', level: 'Full', description: 'Design.', loginUrl: 'https://www.figma.com/' }
    ],
    'QA': [
        { toolName: 'Aplicação 3C+', level: 'Admin nível 3', description: 'Ambiente de teste.', loginUrl: 'https://app.3cplus.com.br' },
        { toolName: 'GitLab', level: 'Regular', description: 'Commits de teste.', loginUrl: 'https://gitlab.com/' }
    ],

    // --- RevOps (RA) ---
    'Líder de RevOps': [
        { toolName: 'HubSpot', level: 'Administrador', description: 'Arquitetura de dados.', loginUrl: 'https://app.hubspot.com/' },
        { toolName: 'n8n', level: 'Owner', description: 'Automações de receita.', loginUrl: 'https://n8n.io/' },
        { toolName: 'BigQuery (GCP)', level: 'Data Owner', description: 'Warehouse de dados.', loginUrl: 'https://console.cloud.google.com/' }
    ]
};

export const getDefaultAccesses = (jobTitle: string): DefaultToolAccess[] => {
    return JOB_TITLE_DEFAULTS[jobTitle] || [];
};
