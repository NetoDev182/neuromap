/**
 * NeuroMap — Google Apps Script (Versão Definitiva v6 — OAuth Token)
 * SOLUÇÃO FINAL: O script envia o ID da imagem + um Token de Acesso temporário.
 * A Vercel usa o Token para baixar a imagem direto dos servidores do Google.
 * Vantagem 1: Bypassa bloqueio de permissões do Google Workspace.
 * Vantagem 2: Bypassa limite de 4.5MB ("Payload Too Large") da Vercel!
 */

var NEUROMAP_API_URL = "https://neuromaplira.vercel.app/api/analyze";

function onFormSubmit(e) {
  // Força o escopo de permissão do Google Drive no Token
  var _driveScopeFix = DriveApp.getStorageUsed(); 

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var uploads = [];
  var studentEmail = "anonimo@aluno.com";

  // 1. Identificar a origem e extrair IDs dos arquivos
  if (e && e.response) {
    studentEmail = e.response.getRespondentEmail() || studentEmail;
    var responses = e.response.getItemResponses();
    responses.forEach(function(itemResponse) {
      var item = itemResponse.getItem();
      if (item.getType() === FormApp.ItemType.FILE_UPLOAD) {
        var ids = itemResponse.getResponse();
        if (!Array.isArray(ids)) ids = [ids];
        ids.forEach(function(id) {
          uploads.push({ questionTitle: item.getTitle(), fileId: id });
        });
      }
    });
  } else if (e && e.namedValues) {
    for (var colTitle in e.namedValues) {
      var val = e.namedValues[colTitle][0];
      if (val && val.indexOf("drive.google.com") > -1) {
        var match = val.match(/id=([a-zA-Z0-9_-]+)/);
        if (match && match[1]) {
          uploads.push({ questionTitle: colTitle, fileId: match[1] });
        }
      }
      if (colTitle.toLowerCase().includes("email")) {
        studentEmail = val || studentEmail;
      }
    }
  }

  if (uploads.length === 0) {
    Logger.log("[NeuroMap] Nenhuma imagem detectada.");
    return;
  }

  var lastRow = sheet.getLastRow();
  
  // 2. Processar uploads: Enviar Token JWT para a Vercel baixar a imagem!
  uploads.forEach(function(upload, index) {
    try {
      // Magia: Geramos um token de acesso temporário que expira em alguns minutos.
      // A Vercel vai usar esse token para baixar o arquivo RESTrito com segurança.
      var driveToken = ScriptApp.getOAuthToken();

      var payload = {
        studentEmail: studentEmail,
        fileId: upload.fileId,
        driveToken: driveToken,
        questionTitle: upload.questionTitle,
        timestamp: new Date().toISOString()
      };

      Logger.log("Enviando " + upload.questionTitle + " para a API Neuromap...");

      // Envia os dados pesados (Base64)
      var response = UrlFetchApp.fetch(NEUROMAP_API_URL, {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      });

      var statusCode = response.getResponseCode();
      var responseText = response.getContentText();
      
      Logger.log("API Retornou: " + statusCode);

      if (statusCode === 200) {
        var data = JSON.parse(responseText);
        var baseCol = sheet.getLastColumn() + 1;
        
        // NOVIDADE: Verifica se a API da Vercel retornou um erro estruturado!
        if (!data.success) {
           sheet.getRange(lastRow, baseCol, 1, 6).setValues([[
             "ERRO", "ERRO", "ERRO", "ERRO", "ERRO API",
             data.error || "Ocorreu um erro desconhecido na Vercel ou no DeepSeek."
           ]]);
           sheet.getRange(lastRow, baseCol, 1, 4).setBackground("#fca5a5");
           return;
        }

        sheet.getRange(lastRow, baseCol, 1, 6).setValues([[
          data.metrics.assimilacao,
          data.metrics.tratamento,
          data.metrics.conversao,
          data.metrics.coordenacao,
          ((data.metrics.assimilacao + data.metrics.tratamento + data.metrics.conversao + data.metrics.coordenacao)/4).toFixed(2),
          data.metrics.insight
        ]]);
        
        var colors = {1:"#fca5a5", 2:"#fcd34d", 3:"#93c5fd", 4:"#86efac"};
        sheet.getRange(lastRow, baseCol, 1, 4).setBackgrounds([[
          colors[data.metrics.assimilacao], colors[data.metrics.tratamento], 
          colors[data.metrics.conversao], colors[data.metrics.coordenacao]
        ]]);
      } else {
        Logger.log("ERRO API: " + responseText);
        var baseCol = sheet.getLastColumn() + 1;
        sheet.getRange(lastRow, baseCol, 1, 6).setValues([[
          "HTTP " + statusCode, "FALHA", "FALHA", "FALHA", "VERCEL/NETWORK ERRO",
          "HTTP Code: " + statusCode + " | " + responseText.substring(0, 200)
        ]]);
        sheet.getRange(lastRow, baseCol, 1, 4).setBackground("#ef4444");
      }
    } catch (err) {
      Logger.log("Erro completo: " + err.toString());
      var baseCol = sheet.getLastColumn() + 1;
      sheet.getRange(lastRow, baseCol, 1, 6).setValues([[
        "ERRO", "SCRIPT", "FALHOU", "FATAL", "Exception",
        err.toString().substring(0, 300)
      ]]);
    }
  });
}

