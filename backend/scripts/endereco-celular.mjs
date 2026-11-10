#!/usr/bin/env node
/**
 * Endereço da API para os apps nos CELULARES (API rodando neste PC).
 *
 * O celular não enxerga o "localhost" do PC: os apps precisam do IP do PC na
 * rede Wi-Fi. Este script mostra esse endereço (deixando de lado adaptadores
 * virtuais do Docker, WSL, VirtualBox...), confere se a API responde nele e
 * explica o que liberar no firewall. Sem dependências.
 *
 * Uso (na pasta CoillectApp, com a API rodando):
 *   node backend/scripts/endereco-celular.mjs              (porta 3000)
 *   node backend/scripts/endereco-celular.mjs --porta 8080
 */
import os from 'node:os';
import { pathToFileURL } from 'node:url';

const VIRTUAL =
  /(vEthernet|WSL|Hyper-V|docker|^br-|veth|virbr|VirtualBox|vboxnet|VMware|vmnet|Loopback|Pseudo|Bluetooth|tailscale|zerotier|utun|awdl|llw|anpi)/i;
const WIFI = /(wi-?fi|wlan|wireless|sem fio|^en0$|^wl)/i;

/** Endereços IPv4 da rede local, do mais provável (Wi-Fi) ao menos provável (virtual). */
export function lanAddresses(interfaces) {
  const found = [];
  for (const [name, entries] of Object.entries(interfaces ?? {})) {
    for (const entry of entries ?? []) {
      const ipv4 = entry.family === 'IPv4' || entry.family === 4;
      if (!ipv4 || entry.internal) continue;
      if (entry.address.startsWith('169.254.')) continue; // sem endereço do roteador (DHCP)
      found.push({
        name,
        address: entry.address,
        virtual: VIRTUAL.test(name),
        wifi: WIFI.test(name),
      });
    }
  }
  const rank = (item) => (item.virtual ? 2 : 0) + (item.wifi ? 0 : 1);
  return found.sort((a, b) => rank(a) - rank(b));
}

/** O que digitar no campo "Servidor da API" dos apps. */
export const appUrl = (address, port) => `http://${address}:${port}/api`;

async function health(baseUrl) {
  try {
    const res = await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(4000) });
    const body = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data: body?.data ?? null };
  } catch (error) {
    return { ok: false, error: error?.cause?.code ?? error?.name ?? String(error) };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const flag = args.indexOf('--porta');
  const port = Number(flag >= 0 ? args[flag + 1] : 3000) || 3000;
  console.log(`\nCoillect — endereço da API para os apps no celular (porta ${port})\n`);

  const local = await health(appUrl('127.0.0.1', port));
  if (!local.data) {
    console.log(`✗ A API não respondeu em http://localhost:${port}/api/health.`);
    console.log('  Suba antes: docker compose up -d --build db azurite backend\n');
    process.exitCode = 1;
    return;
  }
  console.log(
    `✓ API rodando neste PC (banco: ${local.data.database ?? '?'}, armazenamento: ${local.data.storage ?? '?'})\n`,
  );

  const all = lanAddresses(os.networkInterfaces());
  const real = all.filter((item) => !item.virtual);
  const shown = real.length ? real : all;
  if (!shown.length) {
    console.log('✗ Nenhuma rede encontrada: conecte o PC ao Wi-Fi (ou ao hotspot de um celular).\n');
    process.exitCode = 1;
    return;
  }
  console.log('Digite no campo "Servidor da API" dos apps (síndico e empresa):');
  for (const item of shown) {
    const check = await health(appUrl(item.address, port));
    const note = check.data ? '' : '  ← não respondeu nem daqui do PC';
    console.log(`   ${appUrl(item.address, port)}   (${item.name})${note}`);
  }
  console.log(`
Para o celular alcançar o PC:
  1. Celular e PC na MESMA rede Wi-Fi (ou o PC ligado no hotspot do celular).
  2. Windows: libere a porta ${port} no firewall (PowerShell como administrador, uma vez):
       New-NetFirewallRule -DisplayName "Coillect API ${port}" -Direction Inbound -Protocol TCP -LocalPort ${port} -Action Allow -Profile Any
     Para desfazer depois: Remove-NetFirewallRule -DisplayName "Coillect API ${port}"
  3. Nos apps, toque em "Testar conexão" antes de "Entrar".

Se mesmo assim não conectar (Wi-Fi de faculdade costuma isolar os aparelhos):
  - use o hotspot de um celular para o PC e os celulares; ou
  - abra um túnel público: cloudflared tunnel --url http://localhost:${port}
    e digite nos apps https://<endereço>.trycloudflare.com/api ; ou
  - use a API publicada na Azure: https://<app>.azurewebsites.net/api
`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
