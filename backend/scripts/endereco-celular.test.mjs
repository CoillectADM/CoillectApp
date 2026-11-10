import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appUrl, lanAddresses } from './endereco-celular.mjs';

test('prefere o Wi-Fi e deixa adaptadores virtuais (WSL/Docker) por último', () => {
  const list = lanAddresses({
    'vEthernet (WSL (Hyper-V firewall))': [{ family: 'IPv4', address: '172.23.80.1', internal: false }],
    Ethernet: [{ family: 'IPv4', address: '192.168.0.20', internal: false }],
    'Wi-Fi': [
      { family: 'IPv6', address: 'fe80::1', internal: false },
      { family: 'IPv4', address: '192.168.0.15', internal: false },
    ],
    'Loopback Pseudo-Interface 1': [{ family: 'IPv4', address: '127.0.0.1', internal: true }],
  });
  assert.deepEqual(
    list.map((item) => item.address),
    ['192.168.0.15', '192.168.0.20', '172.23.80.1'],
  );
  assert.equal(list[0].wifi, true);
  assert.equal(list[2].virtual, true);
});

test('Linux/macOS: wlan0/en0 primeiro; docker0 e br-* são virtuais', () => {
  const list = lanAddresses({
    docker0: [{ family: 'IPv4', address: '172.17.0.1', internal: false }],
    'br-1a2b3c': [{ family: 'IPv4', address: '172.18.0.1', internal: false }],
    eth0: [{ family: 4, address: '10.0.0.5', internal: false }],
    wlan0: [{ family: 4, address: '192.168.1.7', internal: false }],
  });
  assert.deepEqual(
    list.map((item) => [item.address, item.virtual]),
    [
      ['192.168.1.7', false],
      ['10.0.0.5', false],
      ['172.17.0.1', true],
      ['172.18.0.1', true],
    ],
  );
});

test('ignora endereço automático 169.254 (sem roteador) e interfaces vazias', () => {
  assert.deepEqual(
    lanAddresses({
      'Wi-Fi': [{ family: 'IPv4', address: '169.254.10.2', internal: false }],
      Vazia: undefined,
    }),
    [],
  );
  assert.deepEqual(lanAddresses(undefined), []);
});

test('monta o endereço do campo "Servidor da API"', () => {
  assert.equal(appUrl('192.168.0.15', 3000), 'http://192.168.0.15:3000/api');
});
