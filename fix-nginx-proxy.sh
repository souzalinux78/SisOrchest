#!/bin/bash

# Script para corrigir configuração do Nginx para proxy reverso /api/*

set -e

echo "🔍 Verificando configuração do Nginx..."

# Localizar arquivo de configuração
CONFIG_FILE=""
if [ -f "/etc/nginx/sites-available/sisorquestra" ]; then
    CONFIG_FILE="/etc/nginx/sites-available/sisorquestra"
elif [ -f "/etc/nginx/sites-available/default" ]; then
    CONFIG_FILE="/etc/nginx/sites-available/default"
else
    echo "❌ Arquivo de configuração não encontrado!"
    echo "Por favor, especifique o caminho do arquivo de configuração do Nginx."
    exit 1
fi

echo "📄 Arquivo encontrado: $CONFIG_FILE"

# Verificar se já existe bloco location /api/
if grep -q "location /api/" "$CONFIG_FILE"; then
    echo "⚠️  Bloco location /api/ já existe. Verificando configuração..."
    
    # Verificar se proxy_pass está correto
    if grep -q "proxy_pass http://localhost:4000/api/" "$CONFIG_FILE"; then
        echo "✅ Configuração do proxy_pass está correta!"
    else
        echo "❌ proxy_pass não está configurado corretamente."
        echo "Por favor, corrija manualmente o arquivo $CONFIG_FILE"
        exit 1
    fi
else
    echo "➕ Adicionando bloco location /api/..."
    
    # Criar backup
    cp "$CONFIG_FILE" "${CONFIG_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
    echo "💾 Backup criado: ${CONFIG_FILE}.backup.*"
    
    # Adicionar bloco antes do location /
    # Encontrar linha do location / e adicionar antes
    BLOCK_TO_ADD='
    # Proxy reverso para API
    location /api/ {
        proxy_pass http://localhost:4000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection '\''upgrade'\'';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
'
    
    # Adicionar antes do primeiro location /
    sed -i "/location \//i\\$BLOCK_TO_ADD" "$CONFIG_FILE"
    
    echo "✅ Bloco location /api/ adicionado!"
fi

# Validar configuração
echo "🔍 Validando configuração do Nginx..."
if sudo nginx -t; then
    echo "✅ Configuração válida!"
    echo ""
    echo "📋 Próximos passos:"
    echo "1. Revisar o arquivo: $CONFIG_FILE"
    echo "2. Recarregar Nginx: sudo systemctl reload nginx"
    echo "3. Testar: curl https://sisorquestra.automatizeonline.com.br/api/commons"
else
    echo "❌ Erro na configuração do Nginx!"
    echo "Por favor, corrija os erros antes de continuar."
    exit 1
fi
