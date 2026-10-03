import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { transactionService } from '../firebase/services/transactions';
import { Transaction } from '../firebase/types';

interface TransactionsContextType {
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  createTransaction: (transactionData: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  createTransactions: (transactionsData: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>[]) => Promise<string[]>;
  updateTransaction: (id: string, updates: Partial<Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  loadTransactions: () => Promise<void>;
}

const TransactionsContext = createContext<TransactionsContextType | undefined>(undefined);

interface TransactionsProviderProps {
  children: ReactNode;
  userId: string;
}

export const TransactionsProvider: React.FC<TransactionsProviderProps> = ({ children, userId }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carregar transações do usuário
  const loadTransactions = React.useCallback(async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      setError(null);
      const data = await transactionService.getByUser(userId);
      setTransactions(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao carregar transações';
      setError(errorMessage);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Criar nova transação
  const createTransaction = async (transactionData: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    try {
      const transactionId = await transactionService.create(transactionData);
      
      // Adicionar a nova transação ao estado local imediatamente
      const newTransaction: Transaction = {
        ...transactionData,
        id: transactionId,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      setTransactions(prevTransactions => [newTransaction, ...prevTransactions]);
      
      return transactionId;
    } catch (err) {
      setError('Erro ao criar transação');
      throw err;
    }
  };

  const createTransactions = async (transactionsData: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<string[]> => {
    try {
      const ids = await transactionService.createMany(transactionsData);
      const now = new Date();
      setTransactions(previous => [
        ...transactionsData.map((data, index) => ({ ...data, id: ids[index], createdAt: now, updatedAt: now })),
        ...previous
      ]);
      return ids;
    } catch (err) {
      setError('Erro ao criar parcelas');
      throw err;
    }
  };

  // Atualizar transação
  const updateTransaction = async (id: string, updates: Partial<Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> => {
    try {
      await transactionService.update(id, updates);
      setTransactions((prevTransactions: Transaction[]) => 
        prevTransactions.map((transaction: Transaction) => 
          transaction.id === id 
            ? { ...transaction, ...updates, updatedAt: new Date() }
            : transaction
        )
      );
      
    } catch (err) {
      setError('Erro ao atualizar transação');
      throw err;
    }
  };

  // Deletar transação
  const deleteTransaction = async (id: string): Promise<void> => {
    try {
      // Atualizar estado local ANTES de chamar o Firebase para melhor UX
      setTransactions((prevTransactions: Transaction[]) => 
        prevTransactions.filter((transaction: Transaction) => transaction.id !== id)
      );
      
      await transactionService.delete(id);
      
    } catch (err) {
      // Em caso de erro, recarregar as transações para restaurar o estado correto
      try {
        await loadTransactions();
      } catch (reloadErr) {
        setError('Erro ao deletar transação e recarregar dados');
      }
      
      throw err;
    }
  };

  // Carregar transações quando o userId mudar
  useEffect(() => {
    if (userId) {
      loadTransactions();
    }
  }, [userId]);

  const value: TransactionsContextType = {
    transactions,
    loading,
    error,
    createTransaction,
    createTransactions,
    updateTransaction,
    deleteTransaction,
    loadTransactions
  };

  return (
    <TransactionsContext.Provider value={value}>
      {children}
    </TransactionsContext.Provider>
  );
};

export const useTransactionsContext = (): TransactionsContextType => {
  const context = useContext(TransactionsContext);
  if (context === undefined) {
    throw new Error('useTransactionsContext deve ser usado dentro de um TransactionsProvider');
  }
  return context;
};
