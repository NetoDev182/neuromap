/**
 * NeuroMap — Google Apps Script: "O Mensageiro"
 * 
 * INSTRUÇÕES DE INSTALAÇÃO:
 * 1. Abra seu Google Forms → clique em ⋮ → "Editor de script"
 * 2. Cole este código inteiro no editor
 * 3. Substitua NEUROMAP_API_URL pela URL do seu deploy Next.js
 * 4. Vá em Gatilhos (relógio) → "+ Adicionar gatilho"
 *    - Função: onFormSubmit
 *    - Evento: "Ao enviar formulário"
 * 5. Salve e autorize as permissões necessárias
 */

// ─── Configuração ─────────────────────────────────────────────────────────────
var NEUROMAP_API_URL = "https://SEU-DOMINIO.vercel.app/api/analyze";

/**
 * Gatilho principal: disparado automaticamente quando o aluno envia o formulário.
 * @param {GoogleAppsScript.Events.FormsOnFormSubmit} e - Evento do Forms
 */
function onFormSubmit(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var responses = e.response.getItemResponses();

  // ─── 1. Localizar o campo de e-mail e o campo de upload de imagem ───────────
  var studentEmail = "";
  var imageFileId = "";

  responses.forEach(function (itemResponse) {
    var item = itemResponse.getItem();
    var title = item.getTitle().toLowerCase();
    var answer = itemResponse.getResponse();

    if (title.includes("email") || title.includes("e-mail")) {
      studentEmail = answer;
    }
    // Campos de upload retornam o File ID do Google Drive como resposta
    if (title.includes("imagem") || title.includes("resolução") || title.includes("foto")) {
      imageFileId = answer;
    }
  });

  if (!imageFileId) {
    Logger.log("[NeuroMap] Nenhum upload de imagem encontrado na submissão.");
    return;
  }

  // ─── 2. Converter File ID em URL pública temporária ─────────────────────────
  // O upload via Forms salva o arquivo no Drive com permissão restrita.
  // Abrimos e alteramos a permissão para "anyone with link" temporariamente,
  // para que nossa API Next.js consiga baixar a imagem sem autenticação OAuth.
  var file;
  var imageUrl;

  try {
    // O Forms pode retornar um array de IDs em submissões múltiplas
    var fileId = Array.isArray(imageFileId) ? imageFileId[0] : imageFileId;
    file = DriveApp.getFileById(fileId);

    // Salva a permissão original para restaurar depois
    var originalSharing = file.getSharingAccess();
    var originalPermission = file.getSharingPermission();

    // Torna público temporariamente (apenas leitura)
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    // Constrói a URL de exportação direta (funciona para JPG, PNG, PDF)
    imageUrl = "https://drive.google.com/uc?export=download&id=" + fileId;

  } catch (err) {
    Logger.log("[NeuroMap] Erro ao acessar arquivo do Drive: " + err.message);
    return;
  }

  // ─── 3. Montar payload e chamar a API Next.js ────────────────────────────────
  var payload = {
    studentEmail: studentEmail || e.response.getRespondentEmail() || "anonimo@aluno.com",
    imageUrl: imageUrl,
    timestamp: new Date().toISOString(),
  };

  var options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true, // Captura erros HTTP sem lançar exceção
  };

  Logger.log("[NeuroMap] Enviando para API: " + JSON.stringify(payload));

  var apiResponse = UrlFetchApp.fetch(NEUROMAP_API_URL, options);
  var statusCode = apiResponse.getResponseCode();
  var responseText = apiResponse.getContentText();

  Logger.log("[NeuroMap] Resposta da API (" + statusCode + "): " + responseText);

  // ─── 4. Restaurar permissão do arquivo ──────────────────────────────────────
  try {
    file.setSharing(originalSharing, originalPermission);
    Logger.log("[NeuroMap] Permissão do arquivo restaurada.");
  } catch (restoreErr) {
    Logger.log("[NeuroMap] Aviso: não foi possível restaurar permissão: " + restoreErr.message);
  }

  // ─── 5. Escrever diagnóstico na planilha de respostas ───────────────────────
  if (statusCode === 200) {
    try {
      var diagnosis = JSON.parse(responseText);
      var metrics = diagnosis.metrics;

      // Encontra a linha do envio atual (última linha com dados)
      var lastRow = sheet.getLastRow();

      // Encontra a próxima coluna disponível após os dados existentes
      var lastCol = sheet.getLastColumn();
      var nextCol = lastCol + 1;

      // Cabeçalhos (só escreve se a coluna ainda não tiver cabeçalho)
      var headerCell = sheet.getRange(1, nextCol);
      if (!headerCell.getValue()) {
        sheet.getRange(1, nextCol, 1, 6).setValues([[
          "Assimilação (1-4)",
          "Tratamento (1-4)",
          "Conversão (1-4)",
          "Coordenação (1-4)",
          "Média Duval",
          "Insight NeuroMap"
        ]]);
        // Formata cabeçalhos com destaque azul
        sheet.getRange(1, nextCol, 1, 6)
          .setBackground("#3730a3")
          .setFontColor("#ffffff")
          .setFontWeight("bold");
      }

      // Calcula média dos níveis Duval
      var avg = (
        (metrics.assimilacao + metrics.tratamento + metrics.conversao + metrics.coordenacao) / 4
      ).toFixed(2);

      // Escreve na linha do aluno que acabou de enviar
      sheet.getRange(lastRow, nextCol, 1, 6).setValues([[
        metrics.assimilacao,
        metrics.tratamento,
        metrics.conversao,
        metrics.coordenacao,
        avg,
        diagnosis.insight
      ]]);

      // Aplica código de cores por nível (1=vermelho, 2=laranja, 3=azul, 4=verde)
      var colorMap = { 1: "#fca5a5", 2: "#fcd34d", 3: "#93c5fd", 4: "#86efac" };
      [metrics.assimilacao, metrics.tratamento, metrics.conversao, metrics.coordenacao].forEach(
        function (level, i) {
          sheet.getRange(lastRow, nextCol + i).setBackground(colorMap[level] || "#ffffff");
        }
      );

      Logger.log("[NeuroMap] Diagnóstico escrito na planilha com sucesso!");

    } catch (parseErr) {
      Logger.log("[NeuroMap] Erro ao parsear resposta da API: " + parseErr.message);
      // Escreve o erro bruto na planilha para debug
      var errCol = sheet.getLastColumn() + 1;
      sheet.getRange(sheet.getLastRow(), errCol).setValue("[ERRO] " + responseText.substring(0, 500));
    }
  } else {
    Logger.log("[NeuroMap] API retornou erro " + statusCode + ": " + responseText);
  }
}
