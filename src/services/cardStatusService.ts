/**
 * Serviço para lógica de negócio relacionada ao status de tarefas dos cards.
 * Segue o princípio SRP - separação de lógica de negócio da UI.
 */

export type TarefaStatus = 'sem' | `restante-${number}` | 'vencida';

export interface StatusInfo {
  status: 'sem' | 'restante' | 'vencida';
  variant: 'warning' | 'success' | 'destructive';
  label: string;
}

export interface CardComStatus {
  tarefaStatus: TarefaStatus;
  diasRestantes?: number;
  diasVencidos?: number;
}

/**
 * Computa o status da tarefa baseado na data de retorno.
 */
export const computarStatusTarefa = (dataRetorno: string | null): StatusInfo => {
  if (!dataRetorno) {
    return { 
      status: 'sem', 
      variant: 'warning', 
      label: '⚠️ Sem Tarefa Agendada' 
    };
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  
  const prazo = new Date(dataRetorno);
  prazo.setHours(0, 0, 0, 0);

  const diffMs = prazo.getTime() - hoje.getTime();
  const diffDias = Math.ceil(diffMs / 86400000);

  if (diffDias >= 0) {
    return { 
      status: 'restante',
      variant: 'success',
      label: `🟢 ${diffDias} ${diffDias === 1 ? 'dia' : 'dias'}`
    };
  } else {
    const diasVencidos = Math.abs(diffDias);
    return { 
      status: 'vencida',
      variant: 'destructive',
      label: `🔴 Vencida há ${diasVencidos} ${diasVencidos === 1 ? 'dia' : 'dias'}`
    };
  }
};

/**
 * Gera data de retorno padrão (+7 dias).
 */
export const getDataRetornoPadrao = (): string => {
  const data = new Date();
  data.setDate(data.getDate() + 7);
  return data.toISOString().split('T')[0];
};
