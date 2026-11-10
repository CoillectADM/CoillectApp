import { createHmac } from 'crypto';
import {
  canonicalizedResource,
  parseConnectionString,
  sharedKeyAuthorization,
  STORAGE_API_VERSION,
  stringToSign,
  xmlBlocks,
  xmlEscape,
  xmlText,
  xmlUnescape,
} from './azure-storage.client';

describe('Azure Storage — connection string', () => {
  it('UseDevelopmentStorage=true aponta para o Azurite local', () => {
    const account = parseConnectionString('UseDevelopmentStorage=true');
    expect(account).toMatchObject({
      accountName: 'devstoreaccount1',
      blobEndpoint: 'http://127.0.0.1:10000/devstoreaccount1',
      queueEndpoint: 'http://127.0.0.1:10001/devstoreaccount1',
      sas: null,
      emulator: true,
    });
    expect(account.accountKey).toHaveLength(64);
  });

  it('Azurite em outro host (docker compose)', () => {
    const account = parseConnectionString(
      'UseDevelopmentStorage=true;DevelopmentStorageProxyUri=http://azurite',
    );
    expect(account.blobEndpoint).toBe('http://azurite:10000/devstoreaccount1');
    expect(account.queueEndpoint).toBe('http://azurite:10001/devstoreaccount1');
  });

  it('conta do Azure com chave (formato do portal)', () => {
    const key = Buffer.from('chave-de-teste-da-coillect').toString('base64');
    const account = parseConnectionString(
      `DefaultEndpointsProtocol=https;AccountName=coillectstorage;AccountKey=${key};EndpointSuffix=core.windows.net`,
    );
    expect(account).toMatchObject({
      accountName: 'coillectstorage',
      blobEndpoint: 'https://coillectstorage.blob.core.windows.net',
      queueEndpoint: 'https://coillectstorage.queue.core.windows.net',
      sas: null,
      emulator: false,
    });
    expect(account.accountKey.toString()).toBe('chave-de-teste-da-coillect');
  });

  it('conexão só com SAS (o nome da conta vem do endereço)', () => {
    const account = parseConnectionString(
      'BlobEndpoint=https://coillectstorage.blob.core.windows.net/;QueueEndpoint=https://coillectstorage.queue.core.windows.net/;SharedAccessSignature=sv=2022-11-02&ss=bq&sig=abc%3D',
    );
    expect(account).toMatchObject({
      accountName: 'coillectstorage',
      accountKey: null,
      sas: 'sv=2022-11-02&ss=bq&sig=abc%3D',
      blobEndpoint: 'https://coillectstorage.blob.core.windows.net',
    });
  });

  it('sem chave e sem SAS é erro de configuração', () => {
    expect(() => parseConnectionString('AccountName=x')).toThrow('AccountKey ou SharedAccessSignature');
  });
});

describe('Azure Storage — assinatura Shared Key', () => {
  it('recurso canônico do Azurite repete o nome da conta e ordena os parâmetros', () => {
    const url = new URL(
      'http://127.0.0.1:10000/devstoreaccount1/comprovantes-coleta?restype=container&comp=list&prefix=2026%2F11%2F',
    );
    expect(canonicalizedResource('devstoreaccount1', url)).toBe(
      '/devstoreaccount1/devstoreaccount1/comprovantes-coleta\ncomp:list\nprefix:2026/11/\nrestype:container',
    );
  });

  it('StringToSign do Put Blob segue o formato da documentação', () => {
    const url = new URL('https://conta.blob.core.windows.net/comprovantes-coleta/2026/11/10/coleta-1.json');
    const headers = {
      'x-ms-version': STORAGE_API_VERSION,
      'x-ms-date': 'Tue, 10 Nov 2026 06:00:00 GMT',
      'x-ms-blob-type': 'BlockBlob',
      'content-type': 'application/json; charset=utf-8',
      'content-length': '42',
    };
    expect(stringToSign('put', url, headers, 'conta')).toBe(
      [
        'PUT',
        '', // Content-Encoding
        '', // Content-Language
        '42',
        '', // Content-MD5
        'application/json; charset=utf-8',
        '', // Date
        '',
        '',
        '',
        '',
        '', // Range
        'x-ms-blob-type:BlockBlob',
        'x-ms-date:Tue, 10 Nov 2026 06:00:00 GMT',
        `x-ms-version:${STORAGE_API_VERSION}`,
        '/conta/comprovantes-coleta/2026/11/10/coleta-1.json',
      ].join('\n'),
    );
  });

  it('Content-Length 0 entra vazio e o cabeçalho Authorization é HMAC-SHA256 da chave', () => {
    const key = Buffer.from('segredo-de-teste');
    const account = {
      accountName: 'conta',
      accountKey: key,
      sas: null,
      blobEndpoint: 'https://conta.blob.core.windows.net',
      queueEndpoint: 'https://conta.queue.core.windows.net',
      emulator: false,
    };
    const url = new URL('https://conta.queue.core.windows.net/coillect-notificacoes');
    const headers = { 'x-ms-date': 'Tue, 10 Nov 2026 06:00:00 GMT', 'content-length': '0' };
    const text = stringToSign('PUT', url, headers, 'conta');
    expect(text.split('\n')[3]).toBe('');
    const expected = createHmac('sha256', key).update(text, 'utf8').digest('base64');
    expect(sharedKeyAuthorization(account, 'PUT', url, headers)).toBe(`SharedKey conta:${expected}`);
  });
});

describe('Azure Storage — XML', () => {
  it('escape/unescape preservam o JSON da mensagem da fila', () => {
    const json = JSON.stringify({ condominio: 'Edifício Átria & <Bosque> "A"', nota: "d'água" });
    expect(xmlUnescape(xmlEscape(json))).toBe(json);
    expect(xmlUnescape('&#65;&#x42;')).toBe('AB');
  });

  it('lê os blobs da listagem sem confundir <Blobs> e <BlobType>', () => {
    const xml =
      '<EnumerationResults><Blobs><Blob><Name>a.json</Name><Properties><Content-Length>10</Content-Length>' +
      '<BlobType>BlockBlob</BlobType></Properties></Blob><Blob><Name>b&amp;c.json</Name></Blob></Blobs><NextMarker /></EnumerationResults>';
    const blobs = xmlBlocks(xml, 'Blob');
    expect(blobs).toHaveLength(2);
    expect(xmlText(blobs[0], 'Content-Length')).toBe('10');
    expect(xmlText(blobs[1], 'Name')).toBe('b&c.json');
    expect(xmlText(xml, 'NextMarker')).toBeNull();
  });
});
