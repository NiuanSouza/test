package com.ipem.api.modules.export.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVPrinter;
import org.springframework.stereotype.Service;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import com.lowagie.text.Document;
import com.lowagie.text.PageSize;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import java.awt.Color;

import java.io.ByteArrayOutputStream;
import java.io.OutputStreamWriter;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class ExportService {

    private final ObjectMapper objectMapper;

    public ExportService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    /**
     * Recebe o resultado do Service anterior e converte no formato deseja
     */
    public byte[] exportData(String format, List<?> rawData) {
        if (rawData == null || rawData.isEmpty()) {
            return new byte[0]; // Retorna arquivo vazio se não houver dados
        }

        // 1. Converte qualquer conteudo para uma lista de Maps
        List<Map<String, Object>> normalizedData = rawData.stream()
                .map(item -> objectMapper.convertValue(item, new TypeReference<Map<String, Object>>() {}))
                .toList();

        // 2. Pega as chaves do primeiro item para usar como Cabeçalho das colunas
        List<String> headers = new ArrayList<>(normalizedData.get(0).keySet());

        // 3. Direciona para o formato
        return switch (format.toLowerCase()) {
            case "csv" -> generateCsv(headers, normalizedData);
            case "excel" -> generateExcel(headers, normalizedData);
            case "pdf" -> generatePdf(headers, normalizedData);
            default -> throw new IllegalArgumentException("Formato não suportado: " + format);
        };

    }

    /**
     * Converte o resultado em csv
     */
    private byte[] generateCsv(List<String> headers, List<Map<String, Object>> data) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream();
             OutputStreamWriter writer = new OutputStreamWriter(out, StandardCharsets.UTF_8)) {

            out.write(239);
            out.write(187);
            out.write(191);

            CSVFormat format = CSVFormat.DEFAULT.builder()
                    .setHeader(headers.toArray(new String[0]))
                    .build();

            try (CSVPrinter printer = new CSVPrinter(writer, format)) {
                for (Map<String, Object> row : data) {
                    List<Object> values = new ArrayList<>();
                    for (String header : headers) {
                        values.add(row.get(header));
                    }
                    printer.printRecord(values);
                }
            }

            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Erro ao gerar arquivo CSV", e);
        }
    }

    /**
     * Converte o resultado para pdf
     */
    private byte[] generatePdf(List<String> headers, List<Map<String, Object>> data) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            // Cria o documento. Usando PageSize.A4.rotate() (paisagem) para caber mais colunas
            Document document = new Document(PageSize.A4.rotate());
            PdfWriter.getInstance(document, out);

            document.open();

            // Cria uma tabela com o número de colunas igual ao tamanho da lista de headers
            PdfPTable table = new PdfPTable(headers.size());
            table.setWidthPercentage(100);

            // Criação do cabeçalho (Headers)
            for (String header : headers) {
                PdfPCell cell = new PdfPCell(new Phrase(header));
                cell.setBackgroundColor(Color.LIGHT_GRAY); // Fundo cinza para destacar
                table.addCell(cell);
            }

            // Preenchimento dos dados nas linhas
            for (Map<String, Object> row : data) {
                for (String header : headers) {
                    Object value = row.get(header);
                    // Previne NullPointerException caso o valor da coluna seja nulo
                    String cellValue = (value != null) ? String.valueOf(value) : "";
                    table.addCell(new Phrase(cellValue));
                }
            }

            // Adiciona a tabela ao documento e fecha
            document.add(table);
            document.close();

            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Erro ao gerar arquivo PDF", e);
        }
    }

    /**
     * Converte o resultado em Excel
     */
    private byte[] generateExcel(List<String> headers, List<Map<String, Object>> data) {
        // Usa o XSSFWorkbook para gerar arquivos no formato moderno .xlsx
        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            Sheet sheet = workbook.createSheet("Relatório");

            // Criação de um estilo visual para o cabeçalho (negrito e fundo cinza claro)
            CellStyle headerStyle = workbook.createCellStyle();
            headerStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);

            // Cria a linha 0 (Cabeçalhos)
            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.size(); i++) {
                Cell cell = headerRow.createCell(i);
                // Converte a chave para maiúsculas apenas para apresentação no Excel
                cell.setCellValue(headers.get(i).toUpperCase());
                cell.setCellStyle(headerStyle);
            }

            // Preenche os dados a partir da linha 1
            int rowIndex = 1;
            for (Map<String, Object> rowMap : data) {
                Row row = sheet.createRow(rowIndex++);
                for (int i = 0; i < headers.size(); i++) {
                    Object value = rowMap.get(headers.get(i));
                    Cell cell = row.createCell(i);

                    if (value != null) {
                        // Tipagem inteligente: se for número, salva como número no Excel para permitir somas
                        if (value instanceof Number) {
                            cell.setCellValue(((Number) value).doubleValue());
                        } else if (value instanceof Boolean) {
                            cell.setCellValue((Boolean) value);
                        } else {
                            cell.setCellValue(value.toString());
                        }
                    } else {
                        cell.setCellValue("");
                    }
                }
            }

            // Ajusta o tamanho das colunas automaticamente para o conteúdo caber na tela
            for (int i = 0; i < headers.size(); i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return out.toByteArray();

        } catch (Exception e) {
            throw new RuntimeException("Erro ao gerar arquivo Excel", e);
        }
    }
}
