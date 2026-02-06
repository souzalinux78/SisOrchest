# Guia de Correção - Proxy Reverso Nginx para /api/*

## Problema Identificado

As requisições para `/api/*` estão retornando 404 ou 502 porque o Nginx não está configurado para fazer proxy reverso para o backend Express na porta 4000.

## Configuração do Frontend ✅

O frontend está correto:
- `src/config.ts`: `API_BASE_URL = '/api'` (caminho relativo)
- `src/app/api.ts`: Usa `${API_BASE_URL}${path}` corretamente

## Correção Necessária no Nginx

### 1. Localizar o arquivo de configuração

O arquivo pode estar em:
- `/etc/nginx/sites-available/sisorquestra`
- `/etc/nginx/sites-available/default`
- `/etc/nginx/conf.d/sisorquestra.conf`

### 2. Adicionar bloco de proxy reverso

Dentro do bloco `server {}` que corresponde ao domínio principal, adicionar:

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
    
    # Timeouts
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
}
```

**IMPORTANTE**: 
- O `proxy_pass` DEVE terminar com `/api/` (com barra final)
- Isso garante que `/api/commons` seja redirecionado para `http://localhost:4000/api/commons`

### 3. Garantir que o frontend está servindo arquivos estáticos

O bloco para servir o frontend deve estar assim:

```nginx
location / {
    try_files $uri $uri/ /index.html;
    root /var/www/sisorchest/dist;  # ou o caminho correto do build
}
```

### 4. Exemplo completo de configuração

```nginx
server {
    listen 80;
    server_name sisorquestra.automatizeonline.com.br;
    
    # Redirecionar HTTP para HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name sisorquestra.automatizeonline.com.br;
    
    ssl_certificate /etc/letsencrypt/live/sisorquestra.automatizeonline.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sisorquestra.automatizeonline.com.br/privkey.pem;
    
    # Proxy reverso para API
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

## Comandos de Validação

### 1. Testar configuração do Nginx

```bash
sudo nginx -t
```

Se OK, recarregar:

```bash
sudo systemctl reload nginx
```

### 2. Testar endpoints

```bash
# Testar diretamente na API
curl http://localhost:4000/api/commons

# Testar via domínio público
curl https://sisorquestra.automatizeonline.com.br/api/commons
```

Ambos devem retornar JSON válido.

## Validação Final

Após a correção, os seguintes endpoints devem responder com 200:

- ✅ `GET /api/commons`
- ✅ `GET /api/musicians`
- ✅ `GET /api/services`
- ✅ `GET /api/attendance`
- ✅ `POST /api/auth/login`

## Troubleshooting

### Erro 502 Bad Gateway

- Verificar se a API está rodando: `pm2 status` ou `systemctl status sisorchest`
- Verificar se a porta 4000 está acessível: `netstat -tlnp | grep 4000`
- Verificar logs do Nginx: `sudo tail -f /var/log/nginx/error.log`

### Erro 404 Not Found

- Verificar se o bloco `location /api/` está dentro do `server {}` correto
- Verificar se o `proxy_pass` termina com `/api/` (com barra)
- Verificar se não há conflito com outros blocos `location`

### Erro de CORS

- Verificar se o backend está configurado para aceitar o domínio correto
- Verificar variável `CORS_ORIGIN` no `.env` do backend
