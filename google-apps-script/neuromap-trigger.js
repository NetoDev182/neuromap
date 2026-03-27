/**
 * NeuroMap — Google Apps Script (Versão Universal v5 — Base64)
 * SOLUÇÃO DEFINITIVA: O script agora lê a imagem como Base64 interna
 * e envia pronta para a API, em vez de tentar alterar permissões.
 */

var NEUROMAP_API_URL = "https://neuromaplira.vercel.app/api/analyze";

function onFormSubmit(e) {
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
  
  // 2. Processar uploads: Ler Base64 direto do DriveApp!
  uploads.forEach(function(upload, index) {
    try {
      // Magia aqui: em vez de mudar permissões de compartilhamento,
      // nós pedimos o Blob puro da imagem e convertemos para texto Base64
      var file = DriveApp.getFileById(upload.fileId);
      var blob = file.getBlob();
      var mimeType = blob.getContentType();
      var base64Data = Utilities.base64Encode(blob.getBytes());
      
      var dataUrl = "data:" + mimeType + ";base64," + base64Data;

      var payload = {
        studentEmail: studentEmail,
        imageBase64: dataUrl, // Envia Base64 em vez de URL!
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
      }
    } catch (err) {
      Logger.log("Erro completo: " + err.toString());
    }
  });
}

