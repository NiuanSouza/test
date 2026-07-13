import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { useToast } from '../providers/ToastProvider';
import { History, Activity, Edit3, Plus, Trash2 } from 'lucide-react';
import '../app/(app)/shared-gestao.css'; // Make sure styles are applied

interface AuditHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: 'service' | 'vehicle' | 'user' | 'refueling' | 'cartype';
  entityId: string | number;
  title: string;
}

interface AuditHistoryDTO {
  revisionId: number;
  revisionDate: string;
  revisionType: 'ADD' | 'MOD' | 'DEL';
  entityData: Record<string, any>;
}

export function AuditHistoryModal({ isOpen, onClose, entityType, entityId, title }: AuditHistoryModalProps) {
  const [history, setHistory] = useState<AuditHistoryDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (isOpen && entityId) {
      fetchHistory();
    }
  }, [isOpen, entityId]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8080/audit/history/${entityType}/${entityId}`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("siva_token")}` }
      });
      if (!response.ok) {
        throw new Error("Falha ao buscar histórico de modificações");
      }
      const data = await response.json();
      setHistory(data);
    } catch (error: any) {
      showToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const getRevisionIcon = (type: string) => {
    switch (type) {
      case 'ADD': return <Plus size={20} />;
      case 'MOD': return <Edit3 size={20} />;
      case 'DEL': return <Trash2 size={20} />;
      default: return <Activity size={20} />;
    }
  };

  const getRevisionLabel = (type: string) => {
    switch (type) {
      case 'ADD': return "Criação de Registro";
      case 'MOD': return "Alteração de Dados";
      case 'DEL': return "Exclusão / Inativação";
      default: return "Modificação Desconhecida";
    }
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString('pt-BR');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Histórico: ${title}`}>
      <div style={{ padding: "10px 0 20px 0" }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-secondary)' }}>
            Carregando histórico...
          </div>
        ) : history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-secondary)' }}>
            <History size={48} style={{ margin: '0 auto 16px auto', opacity: 0.5 }} />
            <p>Nenhuma modificação encontrada para este registro.</p>
          </div>
        ) : (
          <div className="history-timeline">
            {history.map((rev, index) => (
              <div key={rev.revisionId || index} className="history-item">
                <div className={`history-icon ${rev.revisionType}`}>
                  {getRevisionIcon(rev.revisionType)}
                </div>
                <div className="history-content">
                  <header>
                    <strong>{getRevisionLabel(rev.revisionType)}</strong>
                    <time>{formatDateTime(rev.revisionDate)}</time>
                  </header>
                  <div className="history-changes">
                    {/* Render specific fields that changed or display general info */}
                    {Object.entries(rev.entityData).map(([key, val]) => {
                      if (val === null || val === undefined) return null;
                      if (typeof val === 'object' && !Array.isArray(val) && val !== null) {
                        return <div key={key}><strong>{key}:</strong> {JSON.stringify(val)}</div>;
                      }
                      return <div key={key}><strong>{key}:</strong> {String(val)}</div>;
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
