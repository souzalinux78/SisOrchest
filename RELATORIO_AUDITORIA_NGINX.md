# Relatório Técnico - Auditoria e Correção do Proxy Reverso Nginx

## Data: 06/02/2026

## Problema Identificado

### Sintomas
- Requisições para `/api/*` retornam **404 Not Found** ou **502 Bad Gateway** em produção
- API funciona localmente via `curl http://localhost:4000/api/commons`
- Frontend faz requisições para `/api/*` mas não recebe resposta

### Causa Raiz
O Nginx **não está configurado** para fazer proxy reverso das requisições `/api/*` para o backend Express rodando na porta 4000.

## Auditoria Realizada

### 1. Frontend ✅ CORRETO

**Arquivo**: `src/config.ts`
```typescript
export const API_BASE_URL = import.meta.env.VITE_API_URL ?? '/api'
```

**Arquivo**: `src/app/api.ts`
```typescript
const request = async <T>(path: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  // ...
}
```

**Conclusão**: 
- Frontend usa caminho relativo `/api` ✅
- Não há referências a `localhost:4000` no código ✅
- Configuração está correta e pronta para proxy reverso ✅

### 2. Backend ✅ CORRETO

**Arquivo**: `server/app.js`
- Rotas montadas corretamente sob `/api` ✅
- API rodando na porta 4000 ✅
- Estrutura de rotas validada na auditoria anterior ✅

### 3. Nginx ❌ FALTA CONFIGURAÇÃO

**Problema**: 
- Bloco `location /api/` não existe ou está mal configurado
- Requisições `/api/*` não são redirecionadas para `http://localhost:4000`

## Correção Necessária

### Configuração do Nginx

Adicionar o seguinte bloco dentro do `server {}` que corresponde ao domínio principal:

```nginx
location /api/ {
    proxy_pass http://localhost:4000/api/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
    
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
}
```

### Pontos Críticos

1. **`proxy_pass` DEVE terminar com `/api/`** (com barra final)
   - ✅ Correto: `proxy_pass http://localhost:4000/api/;`
   - ❌ Errado: `proxy_pass http://localhost:4000;`
   - ❌ Errado: `proxy_pass http://localhost:4000/;`

2. **Ordem dos blocos `location`**
   - O bloco `location /api/` deve vir **ANTES** do bloco `location /`
   - Isso garante que requisições `/api/*` sejam capturadas antes do fallback para arquivos estáticos

3. **Headers de proxy**
   - `X-Real-IP`: IP real do cliente
   - `X-Forwarded-For`: Cadeia de proxies
   - `X-Forwarded-Proto`: Protocolo original (http/https)
   - Esses headers são importantes para logs e segurança

## Passos de Implementação

### 1. Localizar arquivo de configuração

```bash
# Verificar arquivos disponíveis
ls -la /etc/nginx/sites-available/

# Provável localização:
# /etc/nginx/sites-available/sisorquestra
# ou
# /etc/nginx/sites-available/default
```

### 2. Editar arquivo de configuração

```bash
sudo nano /etc/nginx/sites-available/sisorquestra
```

### 3. Adicionar bloco `location /api/`

Adicionar o bloco antes do `location /` dentro do `server {}` do domínio principal.

### 4. Validar configuração

```bash
sudo nginx -t
```

**Saída esperada**:
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### 5. Recarregar Nginx

```bash
sudo systemctl reload nginx
```

### 6. Testar endpoints

```bash
# Testar diretamente na API
curl http://localhost:4000/api/commons

# Testar via domínio público
curl https://sisorquestra.automatizeonline.com.br/api/commons
```

**Resposta esperada**: JSON válido com lista de comuns

## Validação Final

Após a correção, os seguintes endpoints devem responder com **200 OK**:

| Endpoint | Método | Status Esperado |
|----------|--------|----------------|
| `/api/commons` | GET | 200 OK |
| `/api/musicians` | GET | 200 OK |
| `/api/services` | GET | 200 OK |
| `/api/attendance` | GET | 200 OK |
| `/api/auth/login` | POST | 200 OK (com credenciais válidas) |

## Exemplo de Configuração Completa

```nginx
server {
    listen 443 ssl http2;
    server_name sisorquestra.automatizeonline.com.br;
    
    ssl_certificate /etc/letsencrypt/live/sisorquestra.automatizeonline.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sisorquestra.automatizeonline.com.br/privkey.pem;
    
    # Proxy reverso para API - DEVE VIR ANTES DO location /
    location /api/ {
        proxy_pass http://localhost:4000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Servir frontend estático
    location / {
        try_files $uri $uri/ /index.html;
        root /var/www/sisorchest/dist;
    }
}
```

## Troubleshooting

### Erro 502 Bad Gateway

**Causa**: Backend não está rodando ou não está acessível na porta 4000

**Solução**:
```bash
# Verificar se API está rodando
pm2 status
# ou
systemctl status sisorchest

# Verificar se porta 4000 está aberta
netstat -tlnp | grep 4000

# Verificar logs
pm2 logs sisorchest
# ou
journalctl -u sisorchest -f
```

### Erro 404 Not Found

**Causa**: Bloco `location /api/` não existe ou está mal configurado

**Solução**:
- Verificar se o bloco existe no arquivo de configuração
- Verificar se `proxy_pass` termina com `/api/`
- Verificar se o bloco está dentro do `server {}` correto
- Verificar se não há conflito com outros blocos `location`

### Erro de CORS

**Causa**: Backend não está configurado para aceitar requisições do domínio

**Solução**:
- Verificar variável `CORS_ORIGIN` no `.env` do backend
- Deve incluir o domínio público: `https://sisorquestra.automatizeonline.com.br`

## Resumo

### O que foi verificado:
- ✅ Frontend está correto (usa `/api` como caminho relativo)
- ✅ Backend está correto (rotas montadas sob `/api`)
- ❌ Nginx precisa de configuração de proxy reverso

### O que precisa ser feito:
1. Adicionar bloco `location /api/` no Nginx
2. Configurar `proxy_pass` para `http://localhost:4000/api/`
3. Validar e recarregar Nginx
4. Testar endpoints

### Resultado esperado:
- Todas as requisições `/api/*` serão redirecionadas para `http://localhost:4000/api/*`
- Frontend poderá se comunicar com o backend via domínio público
- Erros 404 e 502 serão resolvidos
