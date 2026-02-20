export interface DefaultToolAccess {
    toolName: string;
    level: string;
}

export const JOB_TITLE_DEFAULTS: Record<string, DefaultToolAccess[]> = {
    'Desenvolvedor Full Stack': [
        { toolName: 'GitLab', level: 'Developer' },
        { toolName: 'ClickUp', level: 'Full Access' },
        { toolName: 'Slack', level: 'User' },
        { toolName: 'VPN', level: 'Authorized' }
    ],
    'Customer Success': [
        { toolName: 'HubSpot', level: 'Sales User' },
        { toolName: '3CPlus', level: 'Support' },
        { toolName: 'ClickUp', level: 'Viewer' }
    ],
    'Closer': [
        { toolName: 'HubSpot', level: 'Sales User' },
        { toolName: '3CPlus', level: 'Agent' },
        { toolName: 'Slack', level: 'User' }
    ],
    'Analista de SI e Infraestrutura': [
        { toolName: 'Jumpcloud', level: 'Admin' },
        { toolName: 'GitLab', level: 'Maintainer' },
        { toolName: 'ClickUp', level: 'Admin' },
        { toolName: 'Security Dashboard', level: 'Full' }
    ]
};

export const getDefaultAccesses = (jobTitle: string): DefaultToolAccess[] => {
    return JOB_TITLE_DEFAULTS[jobTitle] || [];
};
