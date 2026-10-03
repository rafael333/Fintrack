import React, { useState, useRef, useEffect } from 'react'
import data from '@emoji-mart/data'
import Picker from '@emoji-mart/react'
import { useCategories } from '../hooks/useCategories'
import { useTransactionsContext } from '../contexts/TransactionsContext'
import { addMonthsClamped, formatLocalDate, parseLocalDate } from '../utils/dates'
import { splitInstallments } from '../utils/money'


interface NewTransactionModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  onTransactionCreating?: (creating: boolean) => void
}

const NewTransactionModal = ({ isOpen, onClose, userId, onTransactionCreating }: NewTransactionModalProps) => {
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    type: 'Despesa',
    category: '',
    date: formatLocalDate(new Date()),
    dueDate: formatLocalDate(new Date()),
        paymentMethod: 'dinheiro',
    installments: 2,
    recurring: false,
    automaticCategorization: false,
    notifications: false
  })

  const [isInstallment, setIsInstallment] = useState(false)
  const previewAmount = Number(formData.amount.replace(/\./g, '').replace(',', '.'))
  const previewInstallments = Number.isFinite(previewAmount) && previewAmount > 0 &&
    Number.isInteger(formData.installments) && formData.installments > 0 &&
    Math.round(previewAmount * 100) >= formData.installments
    ? splitInstallments(previewAmount, formData.installments)
    : []
  const lastPreviewAmount = previewInstallments[previewInstallments.length - 1]
  let previewStartDate: Date | null = null
  try {
    previewStartDate = parseLocalDate(formData.dueDate)
  } catch {
    // O campo de data pode estar temporariamente vazio durante a edição.
  }
  const [isCreatingCategory, setIsCreatingCategory] = useState(false)
  const [isEditingCategory, setIsEditingCategory] = useState(false)
  const [editingCategory, setEditingCategory] = useState<any>(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showCategoryPicker, setShowCategoryPicker] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [categoriesPerPage] = useState(10) // 10 categorias por página
  const emojiPickerRef = useRef<HTMLDivElement>(null)
  const emojiButtonRef = useRef<HTMLDivElement>(null)
  const categoryPickerRef = useRef<HTMLDivElement>(null)
  const categoryPickerButtonRef = useRef<HTMLButtonElement>(null)
  const [newCategory, setNewCategory] = useState({
    name: '',
    color: '#3B82F6',
    icon: '📦'
  })

  // Hook do Firebase para categorias
  const { categories: firebaseCategories, createCategory, updateCategory, deleteCategory, loading: categoriesLoading, error: categoriesError } = useCategories(userId)
  
  // Hook do Firebase para transações
  const { createTransaction, createTransactions, loading: transactionLoading } = useTransactionsContext()
  
  

  // Usar apenas categorias do Firebase e remover duplicatas
  const categories = React.useMemo(() => {
    // Remover duplicatas baseadas no nome da categoria
    const uniqueCategories = firebaseCategories.reduce((acc: any[], current: any) => {
      const existingCategory = acc.find(cat => cat.name === current.name)
      if (!existingCategory) {
        acc.push(current)
      }
      return acc
    }, [])
    
    return uniqueCategories
  }, [firebaseCategories])

  // Função para obter classes CSS do campo de valor baseado no tipo
  const getValueFieldClasses = () => {
    const baseClasses = "w-full pl-10 pr-3 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 text-xl font-bold text-gray-900 shadow-md"
    
    if (formData.type === 'Receita') {
      return `${baseClasses} border-green-300 focus:ring-green-100 focus:border-green-500 bg-green-50 focus:bg-white`
    } else if (formData.type === 'Despesa') {
      return `${baseClasses} border-red-300 focus:ring-red-100 focus:border-red-500 bg-red-50 focus:bg-white`
    }
    
    return `${baseClasses} border-gray-300 focus:ring-gray-100 focus:border-gray-500 bg-gray-50 focus:bg-white`
  }
  
  // Mostrar todas as categorias (sem filtro por tipo)
  const filteredCategories = categories.filter((category: any) => {
    // Mostrar todas as categorias independente do tipo
    return true
  })

  // Lógica de paginação
  const totalPages = Math.ceil(filteredCategories.length / categoriesPerPage)
  const startIndex = (currentPage - 1) * categoriesPerPage
  const endIndex = startIndex + categoriesPerPage
  const paginatedCategories = filteredCategories.slice(startIndex, endIndex)

  // Resetar página quando mudar o tipo de transação
  React.useEffect(() => {
    setCurrentPage(1)
  }, [formData.type])


  // Funções de paginação
  const goToPage = (page: number) => {
    setCurrentPage(page)
  }

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  // Função para lidar com a seleção de emoji
  const handleEmojiSelect = (emoji: any) => {
    if (isEditingCategory) {
      setNewCategory({ ...newCategory, icon: emoji.native })
    } else {
      setNewCategory({ ...newCategory, icon: emoji.native })
    }
    setShowEmojiPicker(false)
  }

  // Função para lidar com a criação de categoria
  const handleCreateCategory = async () => {
    if (!newCategory.name.trim()) return

    try {
      console.log('🚀 [NewTransactionModal] Iniciando criação de categoria...')
      const categoryData = {
        name: newCategory.name,
        color: newCategory.color,
        icon: newCategory.icon,
        type: 'geral' as 'receita' | 'despesa' | 'geral', // Todas as categorias são gerais
        userId: userId
      }
      
      console.log('📤 [NewTransactionModal] Dados da categoria:', categoryData)
      console.log('👤 [NewTransactionModal] UserId:', userId)
      
      const categoryId = await createCategory(categoryData)
      console.log('✅ [NewTransactionModal] Categoria criada com sucesso! ID:', categoryId)
      
      setNewCategory({ name: '', color: '#3B82F6', icon: '📦' })
      setIsCreatingCategory(false)
    } catch (error) {
      console.error('❌ [NewTransactionModal] Erro ao criar categoria:', error)
    }
  }

  // Função para lidar com a edição de categoria
  const handleEditCategory = (category: any) => {
    setEditingCategory(category)
    setNewCategory({
      name: category.name,
      color: category.color,
      icon: category.icon
    })
    setIsEditingCategory(true)
  }

  // Função para lidar com o submit do formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.amount || !formData.category) {
      alert('Por favor, preencha o valor e a categoria')
      return
    }

    try {
      console.log('🚀 [NewTransactionModal] Iniciando criação de transação...')
      console.log('📊 [NewTransactionModal] Dados do formulário:', formData)
      
      // Normalizar string monetária pt-BR (remove milhares e troca vírgula por ponto)
      const normalizeAmount = (s: string) => Number(s.replace(/\./g, '').replace(',', '.'))
      const baseAmount = normalizeAmount(formData.amount)
      if (!Number.isFinite(baseAmount) || baseAmount <= 0) {
        alert('Informe um valor maior que zero.')
        return
      }
      const installmentAmounts = isInstallment && formData.installments > 1
        ? splitInstallments(baseAmount, formData.installments)
        : [baseAmount]
      
      // Garantir que temos uma data válida
      const dueDateValue = formData.dueDate || formatLocalDate(new Date())
      
      // Criar data local para evitar problemas de fuso horário
      let startDate: Date
      try {
        startDate = parseLocalDate(dueDateValue)
      } catch {
        console.error('❌ [NewTransactionModal] Data inválida:', dueDateValue)
        alert('Por favor, selecione uma data válida.')
        return
      }
      
      console.log('📅 [NewTransactionModal] Data processada:', {
        input: dueDateValue,
        parsed: startDate,
        localString: startDate.toLocaleDateString('pt-BR'),
        isoString: startDate.toISOString()
      })
      onTransactionCreating?.(true)
      
      if (isInstallment && formData.installments > 1) {
        // Criar múltiplas transações para parcelas
        console.log(`📦 [NewTransactionModal] Criando ${formData.installments} transações parceladas...`)
        
        const installmentTransactions = []
        const installmentGroupId = `installment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        
        for (let i = 0; i < formData.installments; i++) {
          const installmentDate = addMonthsClamped(startDate, i)
          
          const transactionData = {
            userId: userId,
            description: `${formData.description.trim()} (${i + 1}/${formData.installments})`,
            amount: installmentAmounts[i],
            type: formData.type.toLowerCase() as 'receita' | 'despesa',
            category: formData.category,
            date: installmentDate,
            paymentMethod: formData.paymentMethod.toLowerCase() as 'dinheiro' | 'cartao' | 'pix' | 'transferencia',
            installments: formData.installments,
            installmentNumber: i + 1,
            totalInstallmentAmount: baseAmount,
            installmentGroupId: installmentGroupId,
            isPaid: false, // Parcelas começam como não pagas
            recurring: false,
            notes: `Parcela ${i + 1} de ${formData.installments}`
          }
          
          console.log(`📤 [NewTransactionModal] Criando parcela ${i + 1}:`, {
            ...transactionData,
            amount: transactionData.amount,
            installmentAmount: installmentAmounts[i],
            baseAmount: baseAmount
          })
          installmentTransactions.push(transactionData)
        }
        
        // Aguardar todas as transações serem criadas
        const transactionIds = await createTransactions(installmentTransactions)
        console.log('✅ [NewTransactionModal] Todas as parcelas criadas com sucesso! IDs:', transactionIds)
        
        alert(`${formData.installments} parcelas criadas com sucesso!`)
        
      } else {
        // Criar transação única
        const transactionData = {
          userId: userId,
          description: formData.description.trim(),
          amount: baseAmount,
          type: formData.type.toLowerCase() as 'receita' | 'despesa',
          category: formData.category,
          date: startDate,
          paymentMethod: formData.paymentMethod.toLowerCase() as 'dinheiro' | 'cartao' | 'pix' | 'transferencia',
          installments: undefined,
          recurring: false,
          notes: ''
        }
        
        console.log('📤 [NewTransactionModal] Dados da transação:', transactionData)
        
        const transactionId = await createTransaction(transactionData)
        console.log('✅ [NewTransactionModal] Transação criada com sucesso! ID:', transactionId)
        
        alert('Transação criada com sucesso!')
      }
      
      console.log('🔄 [NewTransactionModal] Limpando formulário e fechando modal...')
      
      // Limpar formulário e fechar modal
      setFormData({
        description: '',
        amount: '',
        type: 'Despesa',
        category: '',
        date: formatLocalDate(new Date()),
        dueDate: formatLocalDate(new Date()),
        paymentMethod: 'dinheiro',
        installments: 1,
        recurring: false,
        automaticCategorization: false,
        notifications: false
      })
      setIsInstallment(false)
      
      console.log('✅ [NewTransactionModal] Formulário limpo, fechando modal...')
      
      // Notificar que terminou de criar transação
      onTransactionCreating?.(false)
      onClose()
      
    } catch (error) {
      console.error('❌ [NewTransactionModal] Erro ao criar transação:', error)
      console.error('❌ [NewTransactionModal] Stack trace:', error instanceof Error ? error.stack : 'N/A')
      
      // Notificar que terminou de criar transação (mesmo com erro)
      onTransactionCreating?.(false)
      alert(`Erro ao criar transação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    }
  }

  // Função para lidar com a atualização de categoria
  const handleUpdateCategory = async () => {
    if (!editingCategory || !newCategory.name.trim()) return

    try {
      await updateCategory(editingCategory.id, {
        name: newCategory.name,
        color: newCategory.color,
        icon: newCategory.icon
      })
      
      setEditingCategory(null)
      setNewCategory({ name: '', color: '#3B82F6', icon: '📦' })
      setIsEditingCategory(false)
    } catch (error) {
      console.error('❌ Erro ao atualizar categoria:', error)
    }
  }

  // Função para lidar com o cancelamento da edição
  const handleCancelEdit = () => {
    setEditingCategory(null)
    setNewCategory({ name: '', color: '#3B82F6', icon: '📦' })
    setIsEditingCategory(false)
  }

  // Função para lidar com a exclusão de categoria
  const handleDeleteCategory = async (category: any) => {
    if (!confirm(`Tem certeza que deseja excluir a categoria "${category.name}"?`)) return

    try {
      await deleteCategory(category.id)
    } catch (error) {
      console.error('❌ Erro ao excluir categoria:', error)
    }
  }

  // Função para limpar categorias duplicadas
  const handleCleanDuplicates = async () => {
    if (!confirm('Tem certeza que deseja remover todas as categorias duplicadas? Isso manterá apenas uma versão de cada categoria.')) return

    try {
      console.log('🧹 Iniciando limpeza de categorias duplicadas...')
      
      // Agrupar categorias por nome
      const categoriesByName = firebaseCategories.reduce((acc: any, category: any) => {
        if (!acc[category.name]) {
          acc[category.name] = []
        }
        acc[category.name].push(category)
        return acc
      }, {})

      // Para cada grupo de categorias com mesmo nome, manter apenas a mais recente
      for (const [categoryName, categoryGroup] of Object.entries(categoriesByName)) {
        if ((categoryGroup as any[]).length > 1) {
          console.log(`🔄 Processando categoria "${categoryName}" com ${(categoryGroup as any[]).length} duplicatas`)
          
          // Ordenar por data de criação (mais recente primeiro)
          const sortedGroup = (categoryGroup as any[]).sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
          
          // Manter apenas a primeira (mais recente) e deletar as outras
          const toKeep = sortedGroup[0]
          const toDelete = sortedGroup.slice(1)
          
          console.log(`✅ Mantendo categoria ID: ${toKeep.id}`)
          
          for (const categoryToDelete of toDelete) {
            console.log(`🗑️ Deletando categoria duplicada ID: ${categoryToDelete.id}`)
            await deleteCategory(categoryToDelete.id)
          }
        }
      }
      
      console.log('✅ Limpeza de duplicatas concluída!')
      alert('Categorias duplicadas removidas com sucesso!')
      
    } catch (error) {
      console.error('❌ Erro ao limpar duplicatas:', error)
      alert('Erro ao limpar duplicatas. Tente novamente.')
    }
  }


  // Fechar pickers quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Emoji picker - fechar quando clicar no backdrop
      if (showEmojiPicker && emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false)
      }
      
      // Category picker
      if (categoryPickerRef.current && !categoryPickerRef.current.contains(event.target as Node) && 
          categoryPickerButtonRef.current && !categoryPickerButtonRef.current.contains(event.target as Node)) {
        setShowCategoryPicker(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showEmojiPicker])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start sm:items-center justify-center z-[9999] p-1 sm:p-4 animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white rounded-lg sm:rounded-3xl shadow-2xl w-full max-w-6xl max-h-[98vh] sm:max-h-[95vh] flex flex-col animate-in zoom-in-95 duration-200 scroll-smooth">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 sm:p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 sm:space-x-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg sm:rounded-xl flex items-center justify-center">
                <span className="text-white text-base sm:text-xl">💰</span>
              </div>
              <div>
                <h3 className="text-2xl sm:text-2xl font-bold text-gray-900">Nova Transação</h3>
                <p className="text-sm sm:text-sm text-gray-600 hidden sm:block">Registre sua movimentação financeira</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 sm:p-2 hover:bg-white/80 rounded-lg sm:rounded-xl transition-all duration-200 hover:scale-105 group"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 sm:w-6 sm:h-6 text-gray-500 group-hover:text-gray-700">
                <path d="M18 6 6 18"></path>
                <path d="m6 6 12 12"></path>
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-2 sm:p-8 flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
            {/* Coluna Principal */}
            <div className="lg:col-span-2">
              {/* Card Principal com todos os campos */}
              <div className="bg-gray-50 rounded-lg sm:rounded-2xl p-2 sm:p-6 space-y-3 sm:space-y-6">
                {/* SEÇÃO 1: Informações da Transação */}
                <div className="bg-white rounded-lg p-2 sm:p-3 shadow-sm border border-gray-200">
                  <div className="flex items-center space-x-2 mb-4 sm:mb-3">
                    <div className="hidden sm:flex w-6 h-6 bg-blue-100 rounded-md items-center justify-center">
                      <span className="text-blue-600 text-sm">📋</span>
                    </div>
                    <h3 className="text-sm sm:text-sm font-semibold text-gray-600">Dados Básicos</h3>
                  </div>
                  
                  <div className="space-y-3">
                    {/* Valor - Campo Principal */}
                    <div>
                      <label className="block text-base font-bold text-gray-900 mb-2">
                        Valor*
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600 text-lg font-bold">R$</span>
                        <input
                          type="text"
                          placeholder="0,00"
                          className={getValueFieldClasses()}
                          value={formData.amount}
                          onChange={(e) => {
                            // Máscara de moeda automática
                            let value = e.target.value.replace(/\D/g, '');
                            if (value) {
                              value = (parseInt(value) / 100).toLocaleString('pt-BR', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              });
                            }
                            setFormData({...formData, amount: value});
                          }}
                          required
                        />
                      </div>
                    </div>

                    {/* Descrição */}
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-2">
                        Descrição
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Ex: Supermercado, Salário..."
                          className="w-full px-3 sm:px-3 py-2.5 sm:py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white text-sm sm:text-sm"
                          value={formData.description}
                          onChange={(e) => setFormData({...formData, description: e.target.value})}
                        />
                        <div className="absolute inset-y-0 right-0 pr-3 hidden sm:flex items-center">
                          <span className="text-gray-400 text-sm">📝</span>
                        </div>
                      </div>
                    </div>

                    {/* Data */}
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-2">
                        Data
                      </label>
                      <div className="relative">
                        <input
                          type="date"
                          className="w-full px-3 sm:px-3 py-2.5 sm:py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white text-sm sm:text-sm"
                          value={formData.dueDate}
                          onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                        />
                        <div className="absolute inset-y-0 right-0 pr-3 hidden sm:flex items-center">
                          <span className="text-gray-400 text-sm">📅</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Parcelamento */}
                  <div className="mt-2 sm:mt-3">
                    <div className="flex items-center space-x-2 mb-1">
                      <input
                        type="checkbox"
                        id="installment"
                        checked={isInstallment}
                        onChange={(e) => setIsInstallment(e.target.checked)}
                        className="w-3 h-3 sm:w-3 sm:h-3 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 focus:ring-1"
                      />
                      <label htmlFor="installment" className="text-sm font-medium text-gray-500 cursor-pointer">
                        Parcelar transação
                      </label>
                    </div>
                    
                    {isInstallment && (
                      <div className="bg-green-50 rounded-md p-3 border border-green-200">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Parcelas
                            </label>
                            <input
                              type="number"
                              min="2"
                              max="60"
                              value={formData.installments || ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (value === '') {
                                  setFormData({...formData, installments: undefined});
                                } else {
                                  const numValue = parseInt(value);
                                  if (numValue >= 2 && numValue <= 60) {
                                    setFormData({...formData, installments: numValue});
                                  }
                                }
                              }}
                              onBlur={(e) => {
                                if (e.target.value === '' || parseInt(e.target.value) < 2) {
                                  setFormData({...formData, installments: 2});
                                }
                              }}
                              placeholder="2"
                              className="w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-transparent text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Valor por parcela
                            </label>
                            <div className="px-2 py-1 bg-white border border-gray-300 rounded-md text-sm font-semibold text-green-600">
                              R$ {(previewInstallments[0] || 0).toFixed(2).replace('.', ',')}
                              {previewInstallments.length > 1 && lastPreviewAmount !== previewInstallments[0] &&
                                ` ou R$ ${lastPreviewAmount.toFixed(2).replace('.', ',')}`}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>


                {/* SEÇÃO 2: Tipo de Transação */}
                <div className="bg-white rounded-lg p-2 sm:p-3 shadow-sm border border-gray-200">
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="hidden sm:flex w-6 h-6 bg-purple-100 rounded-md items-center justify-center">
                      <span className="text-purple-600 text-sm">🔄</span>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-600">Tipo de Transação</h3>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 sm:gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, type: 'Receita'})}
                      className={`p-4 sm:p-3 rounded-xl border-2 transition-all duration-200 transform hover:scale-105 ${
                        formData.type === 'Receita' 
                          ? 'border-green-500 bg-green-500 shadow-lg' 
                          : 'border-green-300 bg-green-50 hover:border-green-400 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-center justify-center">
                        <div className="text-left">
                          <div className={`text-lg font-bold ${
                            formData.type === 'Receita' ? 'text-white' : 'text-green-700'
                          }`}>
                            Receita
                          </div>
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData({...formData, type: 'Despesa'})}
                      className={`p-4 sm:p-3 rounded-xl border-2 transition-all duration-200 transform hover:scale-105 ${
                        formData.type === 'Despesa' 
                          ? 'border-red-500 bg-red-500 shadow-lg' 
                          : 'border-red-300 bg-red-50 hover:border-red-400 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-center justify-center">
                        <div className="text-left">
                          <div className={`text-lg font-bold ${
                            formData.type === 'Despesa' ? 'text-white' : 'text-red-700'
                          }`}>
                            Despesa
                          </div>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Categorias */}
                <div className="hidden sm:block bg-white rounded-xl p-2.5 sm:p-6 shadow-sm border border-gray-200 relative z-10">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <label className="block text-xs sm:text-sm font-semibold text-gray-700 flex items-center space-x-2">
                      <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-orange-500 rounded-full"></span>
                      <span className="hidden sm:inline">Categoria*</span>
                      {categoriesLoading && (
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-xs text-gray-500">Carregando...</span>
                        </div>
                      )}
                    </label>
                    <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-orange-400 rounded-full"></div>
                        <span className="text-xs text-gray-500 font-medium">
                          {filteredCategories.length} categoria{filteredCategories.length !== 1 ? 's' : ''}
                          {totalPages > 1 && ` (página ${currentPage} de ${totalPages})`}
                        </span>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={() => setIsCreatingCategory(true)}
                          className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-semibold text-green-600 bg-green-100 hover:bg-green-200 rounded-lg transition-all duration-200 hover:scale-105 shadow-sm hover:shadow-md"
                        >
                          + Nova Categoria
                        </button>
                        <button
                          type="button"
                          ref={categoryPickerButtonRef}
                          onClick={() => setShowCategoryPicker(!showCategoryPicker)}
                          className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-semibold text-blue-600 bg-blue-100 hover:bg-blue-200 rounded-lg transition-all duration-200 hover:scale-105 shadow-sm hover:shadow-md"
                        >
                          📋 Selecionar Categoria
                        </button>
                      </div>
                    </div>
                  </div>
                
                <div className="space-y-4">
                    {/* Layout Mobile - Oculto - Apenas botões de ação visíveis */}
                    <div className="hidden sm:block">

                    {/* Layout Desktop - Grid */}
                    <div className="hidden sm:grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 max-h-80 overflow-y-auto pr-2 pt-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 scroll-smooth">
                    {paginatedCategories.length > 0 ? (
                      paginatedCategories.map((category: any, index: number) => (
                        <div key={index} className="relative group">
                          <button
                            type="button"
                            onClick={() => setFormData({...formData, category: category.name})}
                            className={`w-full p-5 rounded-lg border-2 transition-all duration-200 ${
                              formData.category === category.name
                                ? 'border-blue-500 bg-blue-50 shadow-md'
                                : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-md'
                            }`}
                          >
                            <div className="flex flex-col items-center space-y-3">
                              <div 
                                className="w-12 h-12 rounded-lg flex items-center justify-center text-white shadow-md"
                                style={{ backgroundColor: category.color }}
                              >
                                <span className="text-xl">{category.icon}</span>
                              </div>
                              <span className="text-sm font-semibold text-gray-800 text-center leading-tight">
                                {category.name}
                              </span>
                            </div>
                          </button>
                          
                          {/* Botão de Editar (direita) */}
                          <button
                            type="button"
                            onClick={() => handleEditCategory(category)}
                            className="absolute top-1 right-1 w-6 h-6 bg-gray-600 hover:bg-gray-700 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-110 z-[9999]"
                          >
                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                            </svg>
                          </button>
                          
                          {/* Botão de Excluir (esquerda) */}
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(category)}
                            className="absolute top-1 left-1 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-110 z-[9999]"
                          >
                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-full flex flex-col items-center justify-center py-8 text-center">
                      {categoriesError ? (
                        <>
                          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                            </svg>
                          </div>
                          <h3 className="text-lg font-medium text-gray-900 mb-2">Erro ao carregar categorias</h3>
                          <p className="text-sm text-gray-500 mb-4">Tente recarregar a página ou criar uma nova categoria</p>
                          <button
                            type="button"
                            onClick={() => window.location.reload()}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors mr-2"
                          >
                            Recarregar
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsCreatingCategory(true)}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                          >
                            + Criar Categoria
                          </button>
                        </>
                      ) : (
                        <div className="col-span-full flex flex-col items-center justify-center py-12 px-4">
                          <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                            <svg className="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                            </svg>
                          </div>
                          <h3 className="text-xl font-bold text-gray-900 mb-3">Nenhuma categoria encontrada</h3>
                          <p className="text-gray-600 mb-6 text-center max-w-sm">
                            Crie categorias personalizadas para organizar suas transações
                          </p>
                          <button
                            type="button"
                            onClick={() => setIsCreatingCategory(true)}
                            className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                          >
                            ✨ Criar Primeira Categoria
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                    </div>
                  </div>
                  
                  {/* Paginação - só aparece quando há mais de uma página */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center space-x-2">
                      <button 
                        type="button"
                        onClick={goToPreviousPage}
                        disabled={currentPage === 1}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                      </button>
                      
                      {/* Botões de página */}
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          type="button"
                          onClick={() => goToPage(page)}
                          className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                            currentPage === page
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                      
                      <button 
                        type="button"
                        onClick={goToNextPage}
                        disabled={currentPage === totalPages}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

            {/* Coluna Lateral - Visualização e Configurações */}
            <div className="space-y-3 lg:space-y-6">
              {/* Visualização Prévia Compacta */}
                <div className="bg-gray-100 rounded-lg p-2 lg:p-4 border border-gray-200">
                  <div className="flex items-center justify-between mb-2 lg:mb-3">
                    <div className="flex items-center space-x-2 lg:space-x-3">
                      <div className="hidden sm:flex w-5 h-5 lg:w-6 lg:h-6 bg-gray-300 rounded items-center justify-center">
                        <span className="text-gray-400 text-xs lg:text-sm">👁️</span>
                      </div>
                      <h3 className="text-xs lg:text-sm font-medium text-gray-500">Pré-visualização</h3>
                    </div>
                    <button 
                      type="button" 
                      className="px-4 sm:px-5 py-2.5 sm:py-3 text-sm font-bold text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 border-2 border-blue-400 hover:border-blue-500 rounded-xl transition-all duration-300 hover:scale-110 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 lg:hidden"
                      onClick={() => setShowCategoryPicker(true)}
                    >
                      Categoria
                    </button>
                  </div>
                
                <div className="bg-gray-50 rounded p-2 lg:p-3 mb-2 lg:mb-3 border border-gray-200">
                  {/* Ícone da categoria */}
                  <div className="flex items-center space-x-3 lg:space-x-4 mb-3">
                    <div 
                      className="w-10 h-10 lg:w-12 lg:h-12 rounded-lg flex items-center justify-center shadow-sm" 
                      style={{
                        backgroundColor: formData.category 
                          ? (firebaseCategories.find(cat => cat.name === formData.category)?.color || '#3B82F6')
                          : '#D1D5DB'
                      }}
                    >
                      <span className="text-lg lg:text-xl">
                        {formData.category 
                          ? (firebaseCategories.find(cat => cat.name === formData.category)?.icon || '📦')
                          : '📦'
                        }
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm lg:text-base font-semibold text-gray-700 truncate">
                        {formData.category || 'Categoria'}
                      </div>
                    </div>
                  </div>
                  
                  {/* Tipo e valor */}
                  <div className="flex items-center justify-between mb-1">
                    <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${
                      formData.type === 'Receita' 
                        ? 'bg-green-50 text-green-500' 
                        : 'bg-red-50 text-red-500'
                    }`}>
                      {formData.type}
                    </span>
                    <div className={`text-sm lg:text-base font-semibold ${
                      formData.type === 'Receita' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formData.type === 'Receita' ? '+' : '-'}R$ {formData.amount || '0,00'}
                    </div>
                  </div>
                  
                  {/* Data */}
                  <div className="text-xs text-gray-400">
                    {formData.dueDate}
                  </div>
                  
                  {/* Parcelamento */}
                  {isInstallment && formData.installments > 1 && (
                    <div className="mt-3 p-2 lg:p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="text-xs text-blue-700 font-medium mb-2">
                        {formData.installments} parcelas de R$ {(previewInstallments[0] || 0).toFixed(2).replace('.', ',')}
                        {previewInstallments.length > 1 && lastPreviewAmount !== previewInstallments[0] &&
                          ` ou R$ ${lastPreviewAmount.toFixed(2).replace('.', ',')}`}
                      </div>
                      <div className="text-xs text-blue-600">
                        <div className="font-semibold mb-1">Datas das parcelas:</div>
                        <div className="space-y-1 max-h-20 overflow-y-auto">
                          {Array.from({ length: formData.installments }, (_, i) => {
                            const installmentDate = previewStartDate ? addMonthsClamped(previewStartDate, i) : null
                            return (
                              <div key={i} className="flex justify-between text-xs">
                                <span>Parcela {i + 1}:</span>
                                <span>{installmentDate?.toLocaleDateString('pt-BR') || '-'}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Botões de Ação - Desktop */}
                <div className="hidden lg:flex flex-col space-y-3 lg:space-y-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full px-4 lg:px-4 py-3 lg:py-3 text-base lg:text-base text-gray-700 bg-white hover:bg-gray-50 rounded-lg font-semibold transition-all duration-200 border-2 border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md transform hover:scale-105"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={transactionLoading}
                    className="w-full px-4 lg:px-4 py-3 lg:py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed text-base lg:text-base"
                  >
                    {transactionLoading ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-4 h-4 lg:w-4 lg:h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Criando...</span>
                      </div>
                    ) : (
                      '✨ Criar Transação'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Botões Fixos no Mobile */}
          <div className="lg:hidden mt-4 p-4 bg-white border-t border-gray-200">
            <div className="flex flex-col space-y-3">
              <button
                type="button"
                onClick={onClose}
                className="w-full px-4 py-3 text-base text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-all duration-200"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={transactionLoading}
                className="w-full px-4 py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg font-bold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed text-lg"
              >
                {transactionLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Criando...</span>
                  </div>
                ) : (
                  'Adicionar Transação'
                )}
              </button>
            </div>
          </div>

        </form>
      </div>

      {/* Modal de Criação de Categoria */}
      {isCreatingCategory && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[10000] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header com gradiente */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
                    <span className="text-white text-xl">🏷️</span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Nova Categoria</h3>
                    <p className="text-sm text-gray-600">Personalize sua categoria</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCreatingCategory(false)}
                  className="p-2 hover:bg-white/80 rounded-xl transition-all duration-200 hover:scale-105 group"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-gray-500 group-hover:text-gray-700">
                    <path d="M18 6 6 18"></path>
                    <path d="m6 6 12 12"></path>
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 flex items-center space-x-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  <span>Nome da Categoria*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Ex: Supermercado, Salário, Lazer..."
                    className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white text-lg"
                    value={newCategory.name}
                    onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                    required
                  />
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                    <span className="text-gray-400 text-sm">📝</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <label className="block text-sm font-semibold text-gray-700 flex items-center space-x-2">
                  <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                  <span>Personalizar Categoria</span>
                </label>
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-6 border-2 border-gray-200">
                  <div className="text-center">
                    <div 
                      ref={emojiButtonRef}
                      className="w-24 h-24 rounded-3xl border-4 border-white shadow-2xl flex items-center justify-center mx-auto mb-4 transform hover:scale-110 transition-all duration-300 cursor-pointer hover:shadow-3xl" 
                      style={{backgroundColor: newCategory.color}}
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    >
                      <span className="text-4xl">{newCategory.icon}</span>
                    </div>
                    <div className="space-y-3">
                      <p className="text-lg font-bold text-gray-800">{newCategory.name || 'Nome da categoria'}</p>
                      <div className="flex items-center justify-center space-x-3">
                        <input
                          type="color"
                          className="w-12 h-12 rounded-xl border-2 border-gray-300 cursor-pointer hover:scale-110 transition-transform duration-200 shadow-lg"
                          value={newCategory.color}
                          onChange={(e) => setNewCategory({...newCategory, color: e.target.value})}
                        />
                        <div className="text-center">
                          <p className="text-xs text-gray-500 mb-1">Cor</p>
                          <span className="px-2 py-1 bg-white rounded-lg text-xs font-mono text-gray-600 shadow-sm">{newCategory.color}</span>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-500 mb-1">Emoji</p>
                          <span className="px-2 py-1 bg-white rounded-lg text-xs text-gray-600 shadow-sm">{newCategory.icon}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsCreatingCategory(false)}
                  className="px-6 py-3 text-gray-700 bg-white hover:bg-gray-50 rounded-xl font-semibold transition-all duration-200 border-2 border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleCreateCategory}
                  disabled={!newCategory.name.trim()}
                  className="px-8 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 disabled:from-gray-300 disabled:to-gray-400 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed"
                >
                  ✨ Criar Categoria
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição de Categoria */}
      {isEditingCategory && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[10000] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header com gradiente laranja/vermelho */}
            <div className="bg-gradient-to-r from-orange-50 to-red-50 p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
                    <span className="text-white text-xl">✏️</span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Editar Categoria</h3>
                    <p className="text-sm text-gray-600">Modifique sua categoria</p>
                  </div>
                </div>
                <button
                  onClick={handleCancelEdit}
                  className="p-2 hover:bg-white/80 rounded-xl transition-all duration-200 hover:scale-105 group"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-gray-500 group-hover:text-gray-700">
                    <path d="M18 6 6 18"></path>
                    <path d="m6 6 12 12"></path>
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 flex items-center space-x-2">
                  <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                  <span>Nome da Categoria*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Ex: Supermercado, Salário, Lazer..."
                    className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white text-lg"
                    value={newCategory.name}
                    onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                    required
                  />
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                    <span className="text-gray-400 text-sm">📝</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <label className="block text-sm font-semibold text-gray-700 flex items-center space-x-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  <span>Personalizar Categoria</span>
                </label>
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-6 border-2 border-gray-200">
                  <div className="text-center">
                    <div 
                      ref={emojiButtonRef}
                      className="w-24 h-24 rounded-3xl border-4 border-white shadow-2xl flex items-center justify-center mx-auto mb-4 transform hover:scale-110 transition-all duration-300 cursor-pointer hover:shadow-3xl" 
                      style={{backgroundColor: newCategory.color}}
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    >
                      <span className="text-4xl">{newCategory.icon}</span>
                    </div>
                    <div className="space-y-3">
                      <p className="text-lg font-bold text-gray-800">{newCategory.name || 'Nome da categoria'}</p>
                      <div className="flex items-center justify-center space-x-3">
                        <input
                          type="color"
                          className="w-12 h-12 rounded-xl border-2 border-gray-300 cursor-pointer hover:scale-110 transition-transform duration-200 shadow-lg"
                          value={newCategory.color}
                          onChange={(e) => setNewCategory({...newCategory, color: e.target.value})}
                        />
                        <div className="text-center">
                          <p className="text-xs text-gray-500 mb-1">Cor</p>
                          <span className="px-2 py-1 bg-white rounded-lg text-xs font-mono text-gray-600 shadow-sm">{newCategory.color}</span>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-500 mb-1">Emoji</p>
                          <span className="px-2 py-1 bg-white rounded-lg text-xs text-gray-600 shadow-sm">{newCategory.icon}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-6 py-3 text-gray-700 bg-white hover:bg-gray-50 rounded-xl font-semibold transition-all duration-200 border-2 border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleUpdateCategory}
                  disabled={!newCategory.name.trim()}
                  className="px-8 py-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:from-gray-300 disabled:to-gray-400 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed"
                >
                  ✏️ Atualizar Categoria
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category Picker Mobile */}
      {showCategoryPicker && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end justify-center z-[9998] sm:hidden">
          <div 
            ref={categoryPickerRef}
            className="bg-white rounded-t-3xl w-full max-h-[70vh] overflow-hidden animate-in slide-in-from-bottom duration-300"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                    <span className="text-white text-sm">📋</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Selecionar Categoria</h3>
                    <p className="text-xs text-gray-600">Arraste para navegar</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCategoryPicker(false)}
                  className="p-2 hover:bg-white/80 rounded-lg transition-all duration-200"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
            </div>

            {/* Categories List */}
            <div className="p-4 max-h-[50vh] overflow-y-auto scroll-smooth">
              {filteredCategories.length > 0 ? (
                <div className="space-y-2">
                  {filteredCategories.map((category: any, index: number) => (
                    <div key={index} className="relative group">
                      <button
                        onClick={() => {
                          setFormData({...formData, category: category.name})
                          setShowCategoryPicker(false)
                        }}
                        className={`w-full p-4 rounded-xl border-2 transition-all duration-200 ${
                          formData.category === category.name
                            ? 'border-blue-500 bg-blue-50 shadow-md'
                            : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-md'
                        }`}
                      >
                        <div className="flex items-center space-x-4">
                          <div 
                            className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-md flex-shrink-0"
                            style={{ backgroundColor: category.color }}
                          >
                            <span className="text-xl">{category.icon}</span>
                          </div>
                          <div className="flex-1 text-left">
                            <div className="text-base font-semibold text-gray-800">
                              {category.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {formData.category === category.name ? 'Selecionada' : 'Toque para selecionar'}
                            </div>
                          </div>
                          {formData.category === category.name && (
                            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                              </svg>
                            </div>
                          )}
                        </div>
                      </button>
                      
                      {/* Botões de ação - sempre visíveis no mobile */}
                      <div className="absolute top-2 right-2 flex space-x-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setShowCategoryPicker(false)
                            handleEditCategory(category)
                          }}
                          className="w-6 h-6 bg-gray-600 hover:bg-gray-700 text-white rounded-full flex items-center justify-center transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-110 z-[9999]"
                        >
                          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                          </svg>
                        </button>
                        
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setShowCategoryPicker(false)
                            handleDeleteCategory(category)
                          }}
                          className="w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-110 z-[9999]"
                        >
                          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">📦</div>
                  <p className="text-sm text-gray-500">Nenhuma categoria encontrada</p>
                  <button
                    onClick={() => {
                      setShowCategoryPicker(false)
                      setIsCreatingCategory(true)
                    }}
                    className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
                  >
                    Criar Primeira Categoria
                  </button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <div className="flex space-x-2">
                <button
                  onClick={() => setIsCreatingCategory(true)}
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
                >
                  + Nova Categoria
                </button>
                <button
                  onClick={() => setShowCategoryPicker(false)}
                  className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg text-sm font-medium hover:bg-gray-600 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10001] p-4">
          <div 
            ref={emojiPickerRef}
            className="emoji-picker-container bg-white rounded-lg shadow-2xl overflow-hidden border border-gray-200 w-full max-w-md max-h-[80vh]"
            style={{
              '--padding': '0px',
              '--sidebar-width': '0px'
            } as React.CSSProperties}
          >
            <div className="w-full h-full [&_section]:w-full [&_section]:!p-0 [&_.padding-lr]:!px-0 [&_.padding]:!p-0">
              <Picker
                data={data}
                onEmojiSelect={handleEmojiSelect}
                theme="light"
                previewPosition="none"
                searchPosition="top"
                skinTonePosition="none"
                perLine={8}
                maxFrequentRows={2}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default NewTransactionModal
