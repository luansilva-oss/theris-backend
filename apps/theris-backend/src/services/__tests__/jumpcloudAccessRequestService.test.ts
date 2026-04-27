import { describe, it, expect, vi, beforeEach } from 'vitest';
import { jumpcloudFetch } from '../jumpcloudAuth';
import { findDeviceByHostname } from '../jumpcloudAccessRequestService';

vi.mock('../jumpcloudAuth', () => ({
  jumpcloudFetch: vi.fn()
}));

const FIXTURE_LAYER1_HIT = {
  displayName: '3C-PLUS-LIN-0816',
  hostname: '3C-PLUS-LIN-0816',
  _id: '69010bce9d0d1958755c228b',
  active: true
};

const FIXTURE_POP_OS = {
  displayName: '3C-PLUS-LIN-0824',
  hostname: 'pop-os',
  _id: '688905474eaf8fa8ee395f53',
  active: true
};

const FIXTURE_EMPRESA_DIVERGE = {
  displayName: '3C-PLUS-LIN-0826',
  hostname: '3C-EVO-LIN-0826',
  _id: '688a62a7cfe6c7d76169c70f',
  active: true
};

const FIXTURE_VLADIMIR_MAC = {
  displayName: 'MacBook-Air-de-Vladimir.local',
  hostname: '3C-PLUS-MAC-1051',
  _id: '685307a7ed8ab15e3314f1f7',
  active: true
};

const FIXTURE_PATRIMONIO_DIVERGE = {
  displayName: '3C-PLUS-LIN-0781',
  hostname: '3C-PLUS-LIN-1951',
  _id: '687288e96849837b91a1aa9f',
  active: true
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

function emptySystems() {
  return jsonResponse({ results: [] });
}

describe('findDeviceByHostname', () => {
  beforeEach(() => {
    vi.mocked(jumpcloudFetch).mockReset();
  });

  it('Estratégia 1: resolve por hostname exato (caminho feliz)', async () => {
    vi.mocked(jumpcloudFetch).mockImplementation(async (url: string) => {
      if (url.includes('hostname:eq:3C-PLUS-LIN-0816')) {
        return jsonResponse({ results: [FIXTURE_LAYER1_HIT] });
      }
      return emptySystems();
    });
    const r = await findDeviceByHostname('3C-PLUS-LIN-0816');
    expect(r).toEqual({
      ok: true,
      deviceId: FIXTURE_LAYER1_HIT._id,
      active: true,
      matchedBy: 'hostname_exact'
    });
  });

  it('Estratégia 2: resolve por displayName quando hostname é pop-os', async () => {
    vi.mocked(jumpcloudFetch).mockImplementation(async (url: string) => {
      if (url.includes('hostname:eq:3C-PLUS-LIN-0824')) {
        return emptySystems();
      }
      if (url.includes('displayName:eq:3C-PLUS-LIN-0824')) {
        return jsonResponse({ results: [FIXTURE_POP_OS] });
      }
      return emptySystems();
    });
    const r = await findDeviceByHostname('3C-PLUS-LIN-0824');
    expect(r).toEqual({
      ok: true,
      deviceId: FIXTURE_POP_OS._id,
      active: true,
      matchedBy: 'displayname_exact'
    });
  });

  it('Estratégia 2: resolve quando hostname tem prefixo de empresa diferente', async () => {
    vi.mocked(jumpcloudFetch).mockImplementation(async (url: string) => {
      if (url.includes('hostname:eq:3C-PLUS-LIN-0826')) {
        return emptySystems();
      }
      if (url.includes('displayName:eq:3C-PLUS-LIN-0826')) {
        return jsonResponse({ results: [FIXTURE_EMPRESA_DIVERGE] });
      }
      return emptySystems();
    });
    const r = await findDeviceByHostname('3C-PLUS-LIN-0826');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.matchedBy).toBe('displayname_exact');
  });

  it('Estratégia 3: resolve por patrimônio quando displayName e hostname têm números diferentes', async () => {
    vi.mocked(jumpcloudFetch).mockImplementation(async (url: string) => {
      if (url.includes('filter=')) {
        return emptySystems();
      }
      if (url.includes('search=1951')) {
        return jsonResponse({ results: [FIXTURE_PATRIMONIO_DIVERGE] });
      }
      return emptySystems();
    });
    const r = await findDeviceByHostname('3C-EVO-LIN-1951');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.matchedBy).toBe('patrimonio_search');
      expect(r.deviceId).toBe(FIXTURE_PATRIMONIO_DIVERGE._id);
    }
  });

  it('Estratégia 3: retorna MULTIPLE com candidates quando há mais de 1 ativo', async () => {
    const dup1 = { ...FIXTURE_POP_OS, _id: 'a' };
    const dup2 = {
      ...FIXTURE_EMPRESA_DIVERGE,
      _id: 'b',
      displayName: '3C-EVO-LIN-0824',
      hostname: '3C-EVO-LIN-0824',
      active: true
    };
    vi.mocked(jumpcloudFetch).mockImplementation(async (url: string) => {
      if (url.includes('filter=')) {
        return emptySystems();
      }
      if (url.includes('search=0824')) {
        return jsonResponse({ results: [dup1, dup2] });
      }
      return emptySystems();
    });
    const r = await findDeviceByHostname('3C-XYZ-LIN-0824');
    expect(r).toMatchObject({ ok: false, error: 'MULTIPLE' });
    if (!r.ok && r.error === 'MULTIPLE') {
      expect(r.candidates).toHaveLength(2);
      expect(r.candidates![0]).toHaveProperty('displayName');
      expect(r.candidates![0]).toHaveProperty('hostname');
    }
  });

  it('Retorna NOT_FOUND quando o input não tem sufixo numérico (sem possibilidade de Estratégia 3)', async () => {
    vi.mocked(jumpcloudFetch).mockImplementation(async (url: string) => {
      if (url.includes('filter=')) {
        return emptySystems();
      }
      return emptySystems();
    });
    const r = await findDeviceByHostname('laptop-abc');
    expect(r).toEqual({ ok: false, error: 'NOT_FOUND' });
  });

  it('Compara patrimônios ignorando zeros à esquerda (066 === 0066)', async () => {
    const fixture066 = {
      displayName: '3C-PLUS-LIN-066',
      hostname: '3C-PLUS-WIN-066',
      _id: 'xyz',
      active: true
    };
    vi.mocked(jumpcloudFetch).mockImplementation(async (url: string) => {
      if (url.includes('filter=')) {
        return emptySystems();
      }
      if (url.includes('search=0066')) {
        return jsonResponse({ results: [fixture066] });
      }
      return emptySystems();
    });
    const r = await findDeviceByHostname('3C-PLUS-LIN-0066');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.deviceId).toBe('xyz');
  });

  it('Estratégia 3: ignora inativos no count de candidates ativos', async () => {
    const inativo = { ...FIXTURE_POP_OS, _id: 'inativo', active: false };
    vi.mocked(jumpcloudFetch).mockImplementation(async (url: string) => {
      if (url.includes('filter=')) {
        return emptySystems();
      }
      if (url.includes('search=0824')) {
        return jsonResponse({ results: [inativo] });
      }
      return emptySystems();
    });
    const r = await findDeviceByHostname('3C-XYZ-LIN-0824');
    expect(r).toEqual({ ok: false, error: 'NOT_FOUND' });
  });

  it('Estratégia 2: displayName exato resolve MacBook.local vs hostname patrimônio', async () => {
    vi.mocked(jumpcloudFetch).mockImplementation(async (url: string) => {
      if (url.includes('hostname:eq:MacBook-Air-de-Vladimir.local')) {
        return emptySystems();
      }
      if (url.includes('displayName:eq:MacBook-Air-de-Vladimir.local')) {
        return jsonResponse({ results: [FIXTURE_VLADIMIR_MAC] });
      }
      return emptySystems();
    });
    const r = await findDeviceByHostname('MacBook-Air-de-Vladimir.local');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.matchedBy).toBe('displayname_exact');
      expect(r.deviceId).toBe(FIXTURE_VLADIMIR_MAC._id);
    }
  });
});
