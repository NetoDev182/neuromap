/**
 * NeuroMap — Google Apps Script: "O Mensageiro" (v2 — corrigido)
 *
 * CORREÇÕES v2:
 * - Bug 1 corrigido: detecção de upload por tipo (FILE_UPLOAD) em vez de keyword no título
 * - Bug 2 corrigido: processa TODAS as imagens do formulário (uma chamada à API por imagem)
 *
 * INSTRUÇÕES DE INSTALAÇÃO:
 * 1. No Apps Script, cole este código (substitui o anterior)
 * 2. Confirme que NEUROMAP_API_URL está com sua URL Vercel correta
 * 3. O gatilho onFormSubmit já deve estar configurado — não precisa recriar
 */

// ─── Configuração ─────────────────────────────────────────────────────────────
var NEUROMAP_API_URL = "https://neuromaplira.vercel.app/api/analyze";

/**
 * Gatilho principal: disparado automaticamente quando o aluno envia o formulário.
 */
function onFormSubmit(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var responses = e.response.getItemResponses();

  // ─── 1. Coletar e-mail e TODOS os campos de upload ──────────────────────────
  // FIX BUG 1+2: Usa item.getType() === FILE_UPLOAD em vez de keyword no título.
  // Isso detecta qualquer campo de upload independente do nome da questão.
  var studentEmail = e.response.getRespondentEmail() || "anonimo@aluno.com";
  var uploads = []; // Array de { questionTitle, fileId }

  responses.forEach(function (itemResponse) {
    var item = itemResponse.getItem();

    // Captura e-mail se houver campo dedicado
    if (item.getType() === FormApp.ItemType.TEXT) {
      var titleLower = item.getTitle().toLowerCase();
      if (titleLower.includes("email") || titleLower.includes("e-mail")) {
        studentEmail = itemResponse.getResponse() || studentEmail;
      }
    }

    // FIX: detecta upload pelo tipo, não pelo título
    if (item.getType() === FormApp.ItemType.FILE_UPLOAD) {
      var fileIds = itemResponse.getResponse(); // retorna array de File IDs
      if (!Array.isArray(fileIds)) fileIds = [fileIds];
      fileIds.forEach(function (fid) {
        if (fid) {
          uploads.push({ questionTitle: item.getTitle(), fileId: fid });
        }
      });
    }
  });

  if (uploads.length === 0) {
    Logger.log("[NeuroMap] Nenhum campo de upload encontrado na submissão.");
    return;
  }

  Logger.log("[NeuroMap] Processando " + uploads.length + " upload(s) de " + studentEmail);

  var timestamp = new Date().toISOString();
  var lastRow = sheet.getLastRow();

  // ─── 2. Processar cada upload individualmente ────────────────────────────────
  // FIX BUG 2: iteramos sobre todos os uploads e fazemos uma chamada à API por imagem
  uploads.forEach(function (upload, index) {
    var file;
    var imageUrl;

    // 2a. Abrir arquivo e tornar público temporariamente
    try {
      file = DriveApp.getFileById(upload.fileId);
      var originalSharing = file.getSharingAccess();
      var originalPermission = file.getSharingPermission();

      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

      // URL de download direto do Google Drive
      imageUrl = "https://drive.google.com/uc?export=download&id=" + upload.fileId;
    } catch (err) {
      Logger.log("[NeuroMap] Erro ao abrir arquivo " + upload.fileId + ": " + err.message);
      return; // pular este upload
    }

    // 2b. Montar payload e chamar a API
    var payload = {
      studentEmail: studentEmail,
      imageUrl: imageUrl,
      questionTitle: upload.questionTitle, // contexto da questão para o prompt
      timestamp: timestamp,
    };

    var options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    };

    Logger.log("[NeuroMap] Enviando Q" + (index + 1) + " (" + upload.questionTitle.substring(0, 40) + ") para API...");

    var apiResponse = UrlFetchApp.fetch(NEUROMAP_API_URL, options);
    var statusCode = apiResponse.getResponseCode();
    var responseText = apiResponse.getContentText();

    Logger.log("[NeuroMap] Resposta Q" + (index + 1) + " (" + statusCode + "): " + responseText.substring(0, 200));

    // 2c. Restaurar permissão do arquivo
    try {
      file.setSharing(originalSharing, originalPermission);
    } catch (restoreErr) {
      Logger.log("[NeuroMap] Aviso: permissão não restaurada: " + restoreErr.message);
    }

    // 2d. Escrever diagnóstico na planilha
    if (statusCode === 200) {
      try {
        var diagnosis = JSON.parse(responseText);
        var metrics = diagnosis.metrics;

        // Calcula a coluna destino: cabeçalho base + (6 colunas * índice da questão)
        var baseCol = sheet.getLastColumn() + 1;

        // Escreve cabeçalho apenas na primeira vez para cada bloco de questão
        var headerLabel = "Q" + (index + 1);
        var headerCell = sheet.getRange(1, baseCol);
        if (!headerCell.getValue()) {
          sheet.getRange(1, baseCol, 1, 7).setValues([[
            headerLabel + " — Assimilação",
            headerLabel + " — Tratamento",
            headerLabel + " — Conversão",
            headerLabel + " — Coordenação",
            headerLabel + " — Média",
            headerLabel + " — Insight NeuroMap",
            headerLabel + " — Questão"
          ]]);
          sheet.getRange(1, baseCol, 1, 7)
            .setBackground("#3730a3")
            .setFontColor("#ffffff")
            .setFontWeight("bold");
        }

        var avg = (
          (metrics.assimilacao + metrics.tratamento + metrics.conversao + metrics.coordenacao) / 4
        ).toFixed(2);

        sheet.getRange(lastRow, baseCol, 1, 7).setValues([[
          metrics.assimilacao,
          metrics.tratamento,
          metrics.conversao,
          metrics.coordenacao,
          avg,
          diagnosis.insight,
          upload.questionTitle.substring(0, 100)
        ]]);

        // Código de cores por nível
        var colorMap = { 1: "#fca5a5", 2: "#fcd34d", 3: "#93c5fd", 4: "#86efac" };
        [metrics.assimilacao, metrics.tratamento, metrics.conversao, metrics.coordenacao].forEach(
          function (level, i) {
            sheet.getRange(lastRow, baseCol + i).setBackground(colorMap[level] || "#ffffff");
          }
        );

        Logger.log("[NeuroMap] Q" + (index + 1) + " escrita na planilha! Média: " + avg);

      } catch (parseErr) {
        Logger.log("[NeuroMap] Erro ao parsear Q" + (index + 1) + ": " + parseErr.message);
        sheet.getRange(lastRow, sheet.getLastColumn() + 1)
          .setValue("[ERRO Q" + (index + 1) + "] " + responseText.substring(0, 300));
      }
    } else {
      Logger.log("[NeuroMap] API erro " + statusCode + " em Q" + (index + 1));
      sheet.getRange(lastRow, sheet.getLastColumn() + 1)
        .setValue("[HTTP " + statusCode + "] " + responseText.substring(0, 200));
    }
  }); // fim forEach uploads

  Logger.log("[NeuroMap] Processamento concluído para " + studentEmail);
}
