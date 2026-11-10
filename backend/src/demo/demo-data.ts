/**
 * Dados de demonstração criados automaticamente (SEED_DEMO=true, padrão).
 * Os nomes seguem os mockups dos apps (EcoColeta, Leonardo, Residencial Aurora…)
 * para a apresentação ficar coerente.
 */
export const DEMO_PASSWORD_DEFAULT = 'Coillect@2025';

export const DEMO_SINDICO = {
  name: 'Leonardo Costa',
  email: 'sindico@coillect.com',
};

export const DEMO_COMPANY = {
  name: 'EcoColeta Ambiental',
  email: 'empresa@coillect.com',
  cnpj: '11222333000181',
};

export const DEMO_THRESHOLD = 80;
export const DEMO_CAPACITY_LITERS = 200;

export interface DemoSite {
  condominium: string;
  address: string;
  neighborhood: string;
  barrelCode: string;
  sensorId: string;
  /** Nível inicial (%) após "Reiniciar demonstração". */
  level: number;
  /** O síndico de demonstração é o síndico deste condomínio? */
  linkSindico: boolean;
}

export const DEMO_SITES: DemoSite[] = [
  {
    condominium: 'Residencial Aurora',
    address: 'Rua das Acácias, 120 - São Paulo/SP',
    neighborhood: 'Jardim Paulista',
    barrelCode: 'BRL-8472',
    sensorId: 'CLT-8472-A',
    level: 0,
    linkSindico: true,
  },
  {
    condominium: 'Condomínio Bosque',
    address: 'Rua dos Ipês, 455 - São Paulo/SP',
    neighborhood: 'Vila Mariana',
    barrelCode: 'BRL-1264',
    sensorId: 'CLT-1264-B',
    level: 62,
    linkSindico: false,
  },
  {
    condominium: 'Edifício Átria',
    address: 'Rua das Palmeiras, 89 - São Paulo/SP',
    neighborhood: 'Pinheiros',
    barrelCode: 'BRL-9801',
    sensorId: 'CLT-9801-C',
    level: 31,
    linkSindico: false,
  },
];

/** Sensor usado no roteiro da demonstração (o do condomínio do síndico de demonstração). */
export const DEMO_MAIN_SENSOR = DEMO_SITES[0].sensorId;
export const DEMO_MAIN_CONDOMINIUM = DEMO_SITES[0].condominium;
export const DEMO_MAIN_BARREL = DEMO_SITES[0].barrelCode;
