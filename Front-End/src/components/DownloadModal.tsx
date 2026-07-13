import React, { useState } from 'react';
import { Modal } from './Modal';
import { Download, FileText, FileSpreadsheet, FileIcon } from 'lucide-react';
import { useToast } from '../providers/ToastProvider';

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  exportUrlPath: string; // e.g. "/export/{format}/users/relatorio"
  defaultFileName?: string;
  extraParams?: Record<string, string>;
}

export function DownloadModal({ isOpen, onClose, exportUrlPath, defaultFileName = "exportacao", extraParams }: DownloadModalProps) {
  const [loadingFormat, setLoadingFormat] = useState<string | null>(null);
  const [fileName, setFileName] = React.useState(defaultFileName);
  const { showToast } = useToast();

  React.useEffect(() => {
    if (isOpen) {
      setFileName(defaultFileName);
    }
  }, [isOpen, defaultFileName]);

  const handleDownload = async (format: string) => {
    setLoadingFormat(format);
    
    // Replace {format} and {fileName} in the path
    let url = `http://localhost:8080${exportUrlPath
      .replace('{format}', format)
      .replace('{fileName}', fileName || defaultFileName)}`;

    if (extraParams && Object.keys(extraParams).length > 0) {
      const params = new URLSearchParams(extraParams);
      url += `?${params.toString()}`;
    }

    try {
      const response = await fetch(url, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("siva_token")}` }
      });

      if (!response.ok) {
        throw new Error("Falha na exportação de dados.");
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${fileName || defaultFileName}.${format === 'excel' ? 'xlsx' : format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      showToast(`Arquivo ${format.toUpperCase()} exportado com sucesso!`, "success");
      onClose();
    } catch (error: any) {
      showToast(error.message || "Erro ao baixar arquivo", "error");
    } finally {
      setLoadingFormat(null);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Exportar Dados">
      <div style={{ padding: "10px 0 20px 0" }}>
        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: 600, color: "var(--color-primary)" }}>
            Nome do Arquivo
          </label>
          <input 
            type="text" 
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            style={{ width: "100%", padding: "12px 16px", borderRadius: "8px", border: "1px solid #e2e8f0", outline: "none", fontSize: "1rem" }}
            placeholder="Digite o nome do arquivo"
          />
        </div>

        <p style={{ color: "var(--color-text-secondary)", marginBottom: "20px" }}>
          Selecione o formato desejado para fazer o download dos dados:
        </p>

        <div style={{ display: "flex", gap: "12px", flexDirection: "column" }}>
          <button 
            onClick={() => handleDownload("excel")}
            disabled={!!loadingFormat}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "16px",
              backgroundColor: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: "8px",
              cursor: "pointer",
              color: "#166534",
              fontWeight: 600,
              fontSize: "1rem",
              transition: "all 0.2s"
            }}
          >
            <FileSpreadsheet size={24} color="#16a34a" />
            {loadingFormat === "excel" ? "Gerando Excel..." : "Exportar como Excel (.xlsx)"}
          </button>

          <button 
            onClick={() => handleDownload("pdf")}
            disabled={!!loadingFormat}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "16px",
              backgroundColor: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "8px",
              cursor: "pointer",
              color: "#991b1b",
              fontWeight: 600,
              fontSize: "1rem",
              transition: "all 0.2s"
            }}
          >
            <FileIcon size={24} color="#dc2626" />
            {loadingFormat === "pdf" ? "Gerando PDF..." : "Exportar como PDF (.pdf)"}
          </button>

          <button 
            onClick={() => handleDownload("csv")}
            disabled={!!loadingFormat}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "16px",
              backgroundColor: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              cursor: "pointer",
              color: "#334155",
              fontWeight: 600,
              fontSize: "1rem",
              transition: "all 0.2s"
            }}
          >
            <FileText size={24} color="#64748b" />
            {loadingFormat === "csv" ? "Gerando CSV..." : "Exportar como CSV (.csv)"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
