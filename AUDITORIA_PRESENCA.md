# 🔍 RELATÓRIO DE AUDITORIA - FLUXO DE PRESENÇA

**Data:** 2026-01-31  
**Objetivo:** Descobrir por que a lógica de inserção automática de faltas não está sendo executada

---

## 📋 1. MAPEAMENTO DE ROTAS

### 1.1 Rota Principal Identificada

**Arquivo:** `server/routes/attendance.js`  
**Linha:** 220  
**Rota:** `POST /attendance`  
**Endpoint Completo:** `/attendance` (montado em `server/app.js` linha 62)

**Código da Rota:**
```javascript
router.post('/', async (req, res) => {
  // Recebe: service_id, presentes (array), service_weekday, service_date
  // Chama: presencaService.salvarPresencasCulto()
})
```

### 1.2 Verificação de Duplicidade

✅ **NÃO HÁ DUPLICIDADE**  
- Apenas UMA rota `POST /attendance` existe no projeto
- Localizada em: `server/routes/attendance.js:220`
- Montada corretamente em: `server/app.js:62` via `app.use('/attendance', attendanceRouter)`

### 1.3 Outras Rotas Relacionadas

**Rota de Visitantes:**
- Arquivo: `server/routes/attendance.js:136`
- Rota: `POST /attendance/visitors`
- **Não interfere** na lógica de presença principal

---

## 📡 2. MAPEAMENTO DO FRONTEND

### 2.1 Chamada da API

**Arquivo:** `src/app/api.ts`  
**Linha:** 143-152  
**Função:** `registerAttendance`

**Código:**
```typescript
registerAttendance: (payload: {
  service_id: number
  presentes: number[]
  service_weekday: string
  service_date: string
}) =>
  request<{ message: string }>('/attendance', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
```

**URL Completa Construída:** `POST /attendance`

### 2.2 Uso no Frontend

**Arquivo:** `src/app/attendance.ts`  
**Linha:** 449  
**Chamada:**
```typescript
await api.registerAttendance({
  service_id: serviceId,
  presentes: presentesIds,
  service_weekday: serviceWeekday,
  service_date: serviceDate,
})
```

✅ **Frontend está chamando a rota correta**

---

## 🔧 3. MAPEAMENTO DO BACKEND

### 3.1 Servidor Principal

**Arquivo:** `server/server.js`  
- Importa `createApp` de `server/app.js`
- Inicia servidor na porta configurada

**Arquivo:** `server/app.js`  
**Linha:** 62  
```javascript
app.use('/attendance', attendanceRouter)
```

✅ **Rota montada corretamente**

### 3.2 Fluxo de Execução

1. **Rota:** `server/routes/attendance.js:220` → `POST /attendance`
2. **Service:** `server/services/presencaService.js:72` → `salvarPresencasCulto()`
3. **Repository:** `server/repositories/presencaRepository.js:228` → `salvarPresencasCulto()`

✅ **Fluxo está correto**

---

## ⚠️ 4. PROBLEMAS IDENTIFICADOS

### 4.1 🔴 PROBLEMA CRÍTICO: Constraint UNIQUE

**Tabela:** `attendance`  
**Schema:** `server/schema.sql:84`  
**Constraint:** `UNIQUE (service_id, musician_id)`

**Problema:**
- A constraint UNIQUE é apenas `(service_id, musician_id)`
- A lógica verifica existência por `service_id + service_date + musician_id`
- **Isso pode causar conflitos** se tentar inserir um registro que já existe para o mesmo `service_id` e `musician_id`, mesmo com `service_date` diferente

**Impacto:**
- Se já existe um registro para `service_id=1, musician_id=5`, não será possível criar outro registro para o mesmo par, mesmo com data diferente
- A inserção em lote pode falhar silenciosamente se houver conflito

### 4.2 🟡 POSSÍVEL PROBLEMA: Verificação de Existência

**Arquivo:** `server/repositories/presencaRepository.js:249`  
**Função:** `buscarMusicosComRegistro()`

**Query:**
```sql
SELECT musician_id FROM attendance 
WHERE service_id = ? 
AND service_date = ?
```

**Observação:**
- A query verifica por `service_id + service_date`
- Mas a constraint UNIQUE é apenas `service_id + musician_id`
- Se houver um registro antigo com mesmo `service_id` mas `service_date` diferente, a verificação pode não detectar corretamente

### 4.3 🟡 POSSÍVEL PROBLEMA: Tratamento de Erros

**Arquivo:** `server/repositories/presencaRepository.js:260-265`  
**Inserção em lote:**
```sql
INSERT INTO attendance 
(service_id, musician_id, status, service_weekday, service_date)
VALUES ...
```

**Observação:**
- Não há tratamento de erro específico para violação de constraint UNIQUE
- Se a inserção falhar por conflito, o erro pode ser silencioso ou genérico

---

## 🛠️ 5. LOGS DE DEBUG ADICIONADOS

### 5.1 Logs na Rota

**Arquivo:** `server/routes/attendance.js:220`
- ✅ Log no início: `🔵 [AUDITORIA] ROTA POST /attendance EXECUTADA`
- ✅ Log do body recebido
- ✅ Log antes de chamar service
- ✅ Log após conclusão do service

### 5.2 Logs no Repository

**Arquivo:** `server/repositories/presencaRepository.js:228`
- ✅ Log de início da função
- ✅ Log de parâmetros recebidos
- ✅ Log de `common_id` encontrado
- ✅ Log de quantidade de músicos ativos
- ✅ Log de músicos com registro existente
- ✅ Log de músicos que precisam ter registro criado
- ✅ Log de criação de registros ausentes
- ✅ Log de atualização para presente
- ✅ Log de atualização para ausente
- ✅ Log de conclusão

---

## 📊 6. ESTRUTURA DA TABELA ATTENDANCE

```sql
CREATE TABLE IF NOT EXISTS attendance (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  service_id BIGINT UNSIGNED NOT NULL,
  musician_id BIGINT UNSIGNED NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'present',
  service_weekday VARCHAR(20) NOT NULL,
  service_date DATE NOT NULL,
  recorded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_attendance_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
  CONSTRAINT fk_attendance_musician FOREIGN KEY (musician_id) REFERENCES musicians(id) ON DELETE CASCADE,
  CONSTRAINT uq_attendance UNIQUE (service_id, musician_id)  -- ⚠️ PROBLEMA AQUI
);
```

**Índices:**
- `idx_attendance_service` em `(service_id)`
- `idx_attendance_service_date` em `(service_date)`

---

## 🎯 7. CONCLUSÕES E RECOMENDAÇÕES

### 7.1 Problema Principal Identificado

🔴 **A constraint UNIQUE `(service_id, musician_id)` está impedindo múltiplos registros para o mesmo culto e músico, mesmo com datas diferentes.**

**Cenário de Problema:**
- Se um culto (`service_id=1`) já tem um registro para `musician_id=5` com `service_date='2026-01-15'`
- Tentar criar um novo registro para o mesmo `service_id=1` e `musician_id=5` com `service_date='2026-01-22'` **FALHARÁ** por violação de constraint

### 7.2 Recomendações Imediatas

1. **Verificar se a constraint está correta:**
   - Se cada `service_id` representa um culto único (não recorrente), a constraint está correta
   - Se `service_id` pode ter múltiplas datas, a constraint precisa incluir `service_date`

2. **Adicionar tratamento de erro específico:**
   - Capturar erro `ER_DUP_ENTRY` (código 1062)
   - Logar detalhes do conflito
   - Decidir se deve atualizar ou ignorar

3. **Usar INSERT ... ON DUPLICATE KEY UPDATE:**
   - Garantir que conflitos sejam tratados automaticamente
   - Atualizar apenas os campos necessários

4. **Testar com os logs adicionados:**
   - Executar um registro de presença
   - Verificar logs no console do servidor
   - Identificar exatamente onde está falhando

### 7.3 Correção Aplicada

✅ **Inserção em lote corrigida:**
- Adicionado `ON DUPLICATE KEY UPDATE` na inserção de registros ausentes
- Adicionado tratamento de erro com logs detalhados
- Garante que conflitos de constraint sejam tratados automaticamente

**Código corrigido:**
```sql
INSERT INTO attendance 
(service_id, musician_id, status, service_weekday, service_date)
VALUES ...
ON DUPLICATE KEY UPDATE 
  status = VALUES(status),
  service_weekday = VALUES(service_weekday),
  service_date = VALUES(service_date),
  recorded_at = CURRENT_TIMESTAMP
```

### 7.4 Próximos Passos

1. ✅ Logs de debug adicionados
2. ✅ Correção de inserção em lote aplicada
3. ⏳ Reiniciar servidor (PM2 ou nodemon)
4. ⏳ Testar registro de presença
5. ⏳ Analisar logs gerados
6. ⏳ Verificar se problema foi resolvido

---

## 📝 8. CHECKLIST DE VERIFICAÇÃO

- [x] Rota POST /attendance identificada
- [x] Frontend chamando rota correta
- [x] Backend montando rota corretamente
- [x] Fluxo Service → Repository mapeado
- [x] Logs de debug adicionados
- [x] Constraint UNIQUE identificada como possível problema
- [x] Correção de inserção em lote aplicada (ON DUPLICATE KEY UPDATE)
- [ ] Servidor reiniciado
- [ ] Teste executado
- [ ] Logs analisados
- [ ] Problema corrigido

---

## 🔄 9. REINICIALIZAÇÃO DO SERVIDOR

**Comando para reiniciar (PM2):**
```bash
pm2 restart sisorchest
pm2 logs sisorchest --lines 100
```

**Comando para reiniciar (desenvolvimento):**
```bash
npm run server
```

**Verificar logs após testar um registro de presença no frontend.**

---

**FIM DO RELATÓRIO**
