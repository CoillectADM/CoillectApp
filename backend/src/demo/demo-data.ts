/**
 * Dados de demonstração criados automaticamente (SEED_DEMO=true, padrão).
 * Os nomes seguem o modo demonstração dos apps para a apresentação ficar coerente.
 */
export const DEMO_PASSWORD_DEFAULT = 'Coillect@2025';

export const DEMO_SINDICO = {
  name: 'Síndico Demonstração',
  email: 'sindico@coillect.com',
};

export const DEMO_COMPANY = {
  name: 'Coleta Verde',
  email: 'empresa@coillect.com',
  cnpj: '11222333000181',
};

export const DEMO_THRESHOLD = 80;
export const DEMO_CAPACITY_LITERS = 200;

export const DEMO_SITES = [
  {
    condominium: 'Condomínio Demonstração',
    address: 'Rua das Flores, 120 - São Paulo/SP',
    sensorId: 'COI-DEMO-01',
    level: 0,
    linkSindico: true,
  },
  {
    condominium: 'Residencial Aurora',
    address: 'Av. Aurora, 455 - São Paulo/SP',
    sensorId: 'COI-ILUS-02',
    level: 35,
    linkSindico: false,
  },
  {
    condominium: 'Edifício Primavera',
    address: 'Rua da Primavera, 89 - São Paulo/SP',
    sensorId: 'COI-ILUS-03',
    level: 12,
    linkSindico: false,
  },
];

/** Sensor usado no roteiro da demonstração (o do síndico de demonstração). */
export const DEMO_MAIN_SENSOR = DEMO_SITES[0].sensorId;
