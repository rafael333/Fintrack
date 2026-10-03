import React, { useState } from 'react';
import { scaleBand, scaleLinear, max, min, line as d3_line, curveMonotoneX } from 'd3';
import { useTransactionsContext } from '../contexts/TransactionsContext';

import { Transaction } from '../firebase/types';
import { sumAmounts } from '../utils/money';

interface ChartData {
  key: string;
  receitas: number;
  despesas: number;
  saldo: number;
}

const BarChartLine = ({ 
  data, 
  hoveredLegend, 
  setHoveredLegend, 
  tooltipData,
  setTooltipData, 
  totalReceitas, 
  totalDespesas, 
  totalSaldo,
  mobileFilter = 'all',
  showMobileTooltip = false,
  setShowMobileTooltip
}: { 
  data: ChartData[];
  hoveredLegend: string | null;
  setHoveredLegend: (value: string | null) => void;
  tooltipData: any;
  setTooltipData: (value: any) => void;
  totalReceitas: number;
  totalDespesas: number;
  totalSaldo: number;
  mobileFilter?: 'all' | 'receitas' | 'despesas' | 'saldo';
  showMobileTooltip?: boolean;
  setShowMobileTooltip?: (value: boolean) => void;
}) => {
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);


  const xScale = scaleBand()
    .domain(data.map((d) => d.key))
    .range([0, 100])
    .padding(0.3);

  // Escala simples para as barras - usar apenas os valores das barras
  const maxReceitas = max(data.map((d) => d.receitas)) ?? 0;
  const maxDespesas = max(data.map((d) => d.despesas)) ?? 0;
  const maxBarras = Math.max(maxReceitas, maxDespesas);
  
  // Escala para o saldo
  const saldos = data.map(d => d.saldo);
  const maxSaldo = max(saldos) ?? 0;
  const minSaldo = min(saldos) ?? 0;
  
  // Escala para as barras
  const yScaleBarras = scaleLinear()
    .domain([0, Math.max(maxBarras, 1)])
    .range([100, 0]);


  // Escala para a linha do saldo - usar valores absolutos e limitar pela altura das barras
  const maxSaldoAbs = Math.max(Math.abs(maxSaldo), Math.abs(minSaldo));
  const yScaleSaldo = scaleLinear()
    .domain([0, Math.max(maxSaldoAbs, maxBarras)])
    .range([100, 0]);

  // Linha zero baseada na escala das barras
  const zeroY = yScaleBarras(0);
  

  // Criar dados estendidos para a linha
  const extendedData = [];
  
  // Ponto antes da primeira vela - começar junto com a primeira vela
  if (data.length > 0) {
    const firstBarX = xScale(data[0].key) ?? 0;
    const firstBarBandwidth = xScale.bandwidth() ?? 0;
    const beforeX = firstBarX; // Começar exatamente na primeira vela
    
    extendedData.push({
      key: 'before',
      receitas: 0,
      despesas: 0,
      saldo: data[0].saldo,
      x: beforeX
    });
  }
  
  // Dados originais
  data.forEach(d => {
    const xPosition = xScale(d.key) ?? 0;
    const bandwidth = xScale.bandwidth() ?? 0;
    extendedData.push({
      ...d,
      x: xPosition + bandwidth / 2
    });
  });
  
  // Ponto depois da última vela - terminar junto com a última vela
  if (data.length > 0) {
    const lastBarX = xScale(data[data.length - 1].key) ?? 0;
    const lastBarBandwidth = xScale.bandwidth() ?? 0;
    const afterX = lastBarX + lastBarBandwidth; // Terminar exatamente no final da última vela
    
    extendedData.push({
      key: 'after',
      receitas: 0,
      despesas: 0,
      saldo: data[data.length - 1].saldo,
      x: afterX
    });
  }

  // Criar pontos individuais para cada mês (sem conectar)
  const individualPoints = data.map((d, index) => {
    const xPosition = xScale(d.key) ?? 0;
    const bandwidth = xScale.bandwidth() ?? 0;
    return {
      ...d,
      x: xPosition + bandwidth / 2,
      y: yScaleSaldo(Math.abs(d.saldo))
    };
  });

  return (
    <div
      className="relative h-72 w-full grid overflow-visible"
      style={{
        "--marginTop": "0px",
        "--marginRight": "25px",
        "--marginBottom": "55px",
        "--marginLeft": "25px",
      } as React.CSSProperties}
    >
      {/* Y axis */}
      <div
        className="relative
          h-[calc(100%-var(--marginTop)-var(--marginBottom))]
          w-[var(--marginLeft)]
          translate-y-[var(--marginTop)]
          overflow-visible
        "
      >
        {yScaleBarras
          .ticks(6) // Usar o mesmo número de ticks
          .map((tick) => (
            <div
              key={tick}
              style={{
                top: `${yScaleBarras(tick)}%`,
              }}
              className="absolute text-xs tabular-nums -translate-y-1/2 text-gray-300 w-full text-right pr-2"
            >
              {tick}
            </div>
          ))}
      </div>


      {/* Chart Area */}
      <div
        className="absolute inset-0
          h-[calc(100%-var(--marginTop)-var(--marginBottom))]
          w-[calc(100%-var(--marginLeft)-var(--marginRight))]
          translate-x-[var(--marginLeft)]
          translate-y-[var(--marginTop)]
          overflow-visible
        "
      >
        <div className="relative w-full h-full">
          <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            {/* Grid lines */}
            {yScaleBarras
              .ticks(6) // Reduzir para 6 linhas para melhor distribuição
              .map((tick) => (
                <g
                  transform={`translate(0,${yScaleBarras(tick)})`}
                  className="text-gray-300/80 dark:text-gray-800/80"
                  key={tick}
                >
                  <line
                    x1={0}
                    x2={100}
                    stroke="currentColor"
                    strokeDasharray="6,5"
                    strokeWidth={0.5}
                    vectorEffect="non-scaling-stroke"
                  />
                </g>
              ))}
          </svg>
        {/* Linha de referência zero */}
        <div
          className="absolute w-full border-t border-gray-300 opacity-40"
          style={{
            bottom: `${zeroY}%`,
            left: 0,
            right: 0,
          }}
        />

          {/* X Axis (Labels) */}
          {data.map((entry, i) => {
            const xPosition = xScale(entry.key)! + xScale.bandwidth() / 2;

            return (
              <div
                key={i}
                className="absolute overflow-visible text-gray-400"
                style={{
                  left: `${xPosition}%`,
                  top: "100%",
                  transform: "rotate(45deg) translateX(4px) translateY(8px)",
                }}
              >
                <div className={`absolute text-xs -translate-y-1/2 whitespace-nowrap`}>
                  {entry.key.slice(0, 10) + (entry.key.length > 10 ? "..." : "")}
                </div>
              </div>
            );
          })}
        </div>

          {/* Barras */}
          {data.map((d, index) => {
            const xPosition = xScale(d.key) || 0;
            const bandwidth = xScale.bandwidth() || 0;
            const PX_BETWEEN_BARS = 5;
            const numBars = 2; // Receitas e Despesas
            const barWidth = (100 - PX_BETWEEN_BARS * (numBars - 1)) / numBars;
            
            return (
              <div
                key={index}
                className="absolute top-0"
                style={{
                  left: `${xPosition}%`,
                  width: `${bandwidth}%`,
                  height: "100%",
                }}
              >
                {/* Receitas Bar */}
                {(mobileFilter === 'all' || mobileFilter === 'receitas') && (
                  <div
                    className="absolute bottom-0 rounded-t cursor-pointer"
                    style={{
                      left: `${0}%`,
                      width: `${barWidth}%`,
                      height: `${100 - yScaleBarras(d.receitas)}%`,
                      backgroundColor: d.receitas > 0 ? 'rgba(34, 197, 94, 0.8)' : 'rgba(34, 197, 94, 0.3)',
                      border: `1px solid rgba(34, 197, 94, 0.2)`,
                      transition: 'all 0.3s ease',
                      zIndex: 1,
                    }}
                    onMouseEnter={() => {
                      setHoveredBar(`${index}-receitas`);
                      setTooltipData({
                        x: xPosition + bandwidth / 2,
                        y: 50,
                        month: d.key,
                        receitas: d.receitas,
                        despesas: d.despesas,
                        saldo: d.saldo,
                      });
                    }}
                    onMouseLeave={() => {
                      setHoveredBar(null);
                      setTooltipData(null);
                    }}
                    onClick={() => {
                      setHoveredBar(`${index}-receitas`);
                      setShowMobileTooltip?.(true);
                      setTooltipData({
                        x: xPosition + bandwidth / 2,
                        y: 50,
                        month: d.key,
                        receitas: d.receitas,
                        despesas: d.despesas,
                        saldo: d.saldo,
                      });
                    }}
                  />
                )}

                {/* Despesas Bar */}
                {(mobileFilter === 'all' || mobileFilter === 'despesas') && (
                  <div
                    className="absolute bottom-0 rounded-t cursor-pointer"
                    style={{
                      left: `${barWidth + PX_BETWEEN_BARS}%`,
                      width: `${barWidth}%`,
                      height: `${100 - yScaleBarras(d.despesas)}%`,
                      backgroundColor: d.despesas > 0 ? 'rgba(239, 68, 68, 0.8)' : 'rgba(239, 68, 68, 0.3)',
                      border: `1px solid rgba(239, 68, 68, 0.2)`,
                      transition: 'all 0.3s ease',
                      zIndex: 2,
                    }}
                    onMouseEnter={() => {
                      setHoveredBar(`${index}-despesas`);
                      setTooltipData({
                        x: xPosition + bandwidth / 2,
                        y: 50,
                        month: d.key,
                        receitas: d.receitas,
                        despesas: d.despesas,
                        saldo: d.saldo,
                      });
                    }}
                    onMouseLeave={() => {
                      setHoveredBar(null);
                      setTooltipData(null);
                    }}
                    onClick={() => {
                      setHoveredBar(`${index}-despesas`);
                      setShowMobileTooltip?.(true);
                      setTooltipData({
                        x: xPosition + bandwidth / 2,
                        y: 50,
                        month: d.key,
                        receitas: d.receitas,
                        despesas: d.despesas,
                        saldo: d.saldo,
                      });
                    }}
                  />
                )}
              </div>
            );
          })}


        {/* Ponto final da linha com efeito ping */}
        {(mobileFilter === 'all' || mobileFilter === 'saldo') && extendedData.length > 0 && (() => {
          // Encontrar o último ponto real da linha (penúltimo item do extendedData)
          const lastRealPoint = extendedData[extendedData.length - 2]; // Penúltimo item (último ponto real)
          const centerX = lastRealPoint.x;
          const centerY = yScaleSaldo(Math.abs(lastRealPoint.saldo));
          
          return (
            <div
              className="absolute size-2 z-15"
              style={{
                left: `${centerX}%`,
                top: `${centerY}%`,
                transform: "translate(-50%, -50%)",
              }}
            >
              <div 
                className="w-full h-full rounded-full bg-blue-500 border-2 border-blue-400 cursor-pointer animate-ping"
                onMouseEnter={() => {
                  setHoveredBar('line');
                  setTooltipData({
                    x: centerX,
                    y: centerY,
                    month: 'Saldo Acumulado',
                    receitas: 0,
                    despesas: 0,
                    saldo: data.reduce((sum, d) => sum + d.saldo, 0),
                  });
                }}
                onMouseLeave={() => {
                  setHoveredBar(null);
                  setTooltipData(null);
                }}
                onClick={() => {
                  setHoveredBar('line');
                  setShowMobileTooltip?.(true);
                  setTooltipData({
                    x: centerX,
                    y: centerY,
                    month: 'Saldo Acumulado',
                    receitas: 0,
                    despesas: 0,
                    saldo: data.reduce((sum, d) => sum + d.saldo, 0),
                  });
                }}
              />
            </div>
          );
        })()}


        {/* Tooltip */}
        {(tooltipData && (hoveredLegend || showMobileTooltip)) && (
          <div
            className="absolute z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-4"
            style={{
              left: `${tooltipData.x}%`,
              top: `${tooltipData.y}%`,
              transform: 'translate(-50%, -100%)',
              maxWidth: '200px',
              minWidth: '150px',
            }}
          >
            {/* Botão para fechar no mobile */}
            <div className="lg:hidden absolute top-2 right-2">
              <button
                onClick={() => {
                  setShowMobileTooltip(false);
                  setHoveredLegend(null);
                  setTooltipData(null);
                }}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none"
              >
                ×
              </button>
            </div>
            <div className="text-sm font-semibold text-gray-900 mb-2 border-b pb-1">
              {tooltipData.month}
            </div>
            
            {tooltipData.month === 'Saldo Acumulado' ? (
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-blue-600 font-semibold">Saldo Total:</span>
                  <span className={`text-xs font-bold ${
                    tooltipData.saldo > 0 ? 'text-green-600' : 
                    tooltipData.saldo < 0 ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    R$ {(tooltipData.saldo * 1000).toFixed(2)}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-2 text-center">
                  Soma dos saldos de todos os meses
                </div>
              </div>
            ) : hoveredLegend === 'receitas' ? (
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-green-600 font-semibold">Total de Receitas:</span>
                  <span className="text-xs text-green-600 font-bold">
                    R$ {(totalReceitas * 1000).toFixed(2)}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-2 text-center">
                  Soma de todas as receitas dos 12 meses
                </div>
              </div>
            ) : hoveredLegend === 'despesas' ? (
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-red-600 font-semibold">Total de Despesas:</span>
                  <span className="text-xs text-red-600 font-bold">
                    R$ {(totalDespesas * 1000).toFixed(2)}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-2 text-center">
                  Soma de todas as despesas dos 12 meses
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-green-600 font-medium">Receitas:</span>
                  <span className="text-xs text-green-600 font-semibold">
                    R$ {(tooltipData.receitas * 1000).toFixed(2)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-xs text-red-600 font-medium">Despesas:</span>
                  <span className="text-xs text-red-600 font-semibold">
                    R$ {(tooltipData.despesas * 1000).toFixed(2)}
                  </span>
                </div>
                
                <div className="border-t pt-1 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-blue-600 font-semibold">Saldo do Mês:</span>
                    <span className={`text-xs font-bold ${
                      tooltipData.saldo > 0 ? 'text-green-600' : 
                      tooltipData.saldo < 0 ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      R$ {(tooltipData.saldo * 1000).toFixed(2)}
                    </span>
                  </div>
                </div>
                
                {tooltipData.receitas === 0 && tooltipData.despesas === 0 && (
                  <div className="text-xs text-gray-500 mt-2 text-center">
                    Nenhuma transação neste mês
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Função para processar dados das transações
const processTransactionsData = (transactions: Transaction[], selectedYear: number): ChartData[] => {
  // Gerar 12 meses: últimos 3 meses + mês atual + próximos 8 meses
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  
  const months = [];
  // Últimos 3 meses (começando 3 meses atrás)
  for (let i = -3; i < 9; i++) {
    const monthDate = new Date(currentYear, currentMonth + i, 1);
    const monthName = monthDate.toLocaleDateString('pt-BR', { month: 'short' });
    const year = monthDate.getFullYear();
    months.push({ name: monthName, year: year, monthIndex: monthDate.getMonth() });
  }


  return months.map((month, monthIndex) => {
    // Criar range do mês
    const monthStart = new Date(month.year, month.monthIndex, 1);
    const monthEnd = new Date(month.year, month.monthIndex + 1, 1);

    // Verificar se as datas são válidas
    if (isNaN(monthStart.getTime()) || isNaN(monthEnd.getTime())) {
      console.warn(`⚠️ [FinancialEvolution] Datas inválidas para mês ${month.name}:`, {
        monthName: month.name,
        year: month.year,
        monthIndex: month.monthIndex,
        monthStart,
        monthEnd
      });
      return {
        key: month.name,
        receitas: 0,
        despesas: 0,
        saldo: 0
      };
    }

    // Filtrar transações do mês
    const monthTransactions = transactions.filter(transaction => {
      try {
        const transactionDate = new Date(transaction.date);
        
        // Verificar se a data é válida
        if (isNaN(transactionDate.getTime())) {
          console.warn(`⚠️ [FinancialEvolution] Data inválida para transação ${transaction.description}:`, transaction.date);
          return false;
        }
        
        const isInMonth = transactionDate >= monthStart && transactionDate < monthEnd;
        
        // Incluir todas as transações do mês (pagas e não pagas)
        return isInMonth;
      } catch (error) {
        console.warn(`⚠️ [FinancialEvolution] Erro ao processar transação ${transaction.description}:`, error);
        return false;
      }
    });

    // Calcular totais do mês (todas as transações - pagas e não pagas)
    const receitas = sumAmounts(monthTransactions
      .filter(t => t.type === 'receita')
      .map(t => t.amount));
    
    const despesas = sumAmounts(monthTransactions
      .filter(t => t.type === 'despesa')
      .map(t => t.amount));
    
    // Calcular saldo individual do mês
    const saldoMes = sumAmounts([receitas, -despesas]);

    return {
      key: month.name,
      receitas: receitas / 1000, // Converter para milhares
      despesas: despesas / 1000,
      saldo: saldoMes / 1000 // Saldo individual do mês
    };
  });
};

interface FinancialEvolutionProps {
  selectedMonth: number;
  selectedYear: number;
}

const FinancialEvolution = ({ selectedMonth, selectedYear }: FinancialEvolutionProps) => {
  const [hoveredLegend, setHoveredLegend] = useState<string | null>(null);
  const [tooltipData, setTooltipData] = useState<{
    x: number;
    y: number;
    month: string;
    receitas: number;
    despesas: number;
    saldo: number;
  } | null>(null);
  
  // Estado para filtro mobile
  const [mobileFilter, setMobileFilter] = useState<'all' | 'receitas' | 'despesas' | 'saldo'>('all');
  
  // Estado para controlar tooltip no mobile
  const [showMobileTooltip, setShowMobileTooltip] = useState(false);
  const { transactions, loading, error } = useTransactionsContext();


  try {
    
    
    // Loading state
    if (loading) {
      return (
        <div className="bg-white rounded-lg shadow border h-full p-6 flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-gray-600">Carregando dados...</span>
          </div>
        </div>
      );
    }

    // Error state
    if (error) {
      return (
        <div className="bg-white rounded-lg shadow border h-full p-6 flex items-center justify-center">
          <div className="text-center text-red-600">
            <p>Erro ao carregar dados</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
      );
    }

    // Processar dados reais das transações
    const chartData = processTransactionsData(transactions, selectedYear);
    
    // Calcular totais
    const totalReceitas = chartData.reduce((sum, d) => sum + d.receitas, 0);
    const totalDespesas = chartData.reduce((sum, d) => sum + d.despesas, 0);
    const totalSaldo = chartData.reduce((sum, d) => sum + d.saldo, 0);
    

    return (
      <div className="bg-white rounded-lg shadow border h-full p-3 sm:p-6 min-h-[500px] sm:min-h-[550px]">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Evolução Financeira</h2>
        
        {/* Switch de filtro mobile */}
        <div className="lg:hidden mb-2">
          <div className="flex items-center justify-center space-x-0.5 bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setMobileFilter('all')}
              className={`px-1.5 py-0.5 text-xs font-medium rounded-md transition-all duration-200 ${
                mobileFilter === 'all'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setMobileFilter('receitas')}
              className={`px-1.5 py-0.5 text-xs font-medium rounded-md transition-all duration-200 ${
                mobileFilter === 'receitas'
                  ? 'bg-green-100 text-green-700 shadow-sm'
                  : 'text-gray-600 hover:text-green-700'
              }`}
            >
              Receita
            </button>
            <button
              onClick={() => setMobileFilter('despesas')}
              className={`px-1.5 py-0.5 text-xs font-medium rounded-md transition-all duration-200 ${
                mobileFilter === 'despesas'
                  ? 'bg-red-100 text-red-700 shadow-sm'
                  : 'text-gray-600 hover:text-red-700'
              }`}
            >
              Despesa
            </button>
            <button
              onClick={() => setMobileFilter('saldo')}
              className={`hidden sm:block px-1.5 py-0.5 text-xs font-medium rounded-md transition-all duration-200 ${
                mobileFilter === 'saldo'
                  ? 'bg-blue-100 text-blue-700 shadow-sm'
                  : 'text-gray-600 hover:text-blue-700'
              }`}
            >
              Saldo
            </button>
          </div>
        </div>
        
        <div className="h-64 sm:h-80 w-full mt-1 sm:mt-4">
          <BarChartLine 
            data={chartData} 
            hoveredLegend={hoveredLegend}
            setHoveredLegend={setHoveredLegend}
            tooltipData={tooltipData}
            setTooltipData={setTooltipData}
            totalReceitas={totalReceitas}
            totalDespesas={totalDespesas}
            totalSaldo={totalSaldo}
            mobileFilter={mobileFilter}
            showMobileTooltip={showMobileTooltip}
            setShowMobileTooltip={setShowMobileTooltip}
          />
        </div>
        
        {/* Legenda do Gráfico */}
        <div className="mt-4 sm:mt-8">
          {/* Labels dos Meses - Mobile */}
          <div className="sm:hidden mb-3">
            <div className="flex items-center justify-center gap-1 text-xs overflow-x-auto px-2">
              {chartData.map((d, index) => (
                <div
                  key={`mobile-label-${d.key}`}
                  className="text-gray-600 font-medium px-0.5 py-0.5 rounded flex-shrink-0 text-center min-w-[20px] text-xs"
                >
                  {d.key}
                </div>
              ))}
            </div>
          </div>
          
          {/* Legenda de Receitas, Despesas e Saldo */}
          <div className="flex items-center justify-center gap-4 text-xs flex-wrap px-2">
          {(mobileFilter === 'all' || mobileFilter === 'receitas') && (
            <div 
              className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity"
              onMouseEnter={() => {
                setHoveredLegend('receitas');
                setTooltipData({
                  x: 50,
                  y: 30,
                  month: 'Total de Receitas',
                  receitas: totalReceitas,
                  despesas: 0,
                  saldo: 0,
                });
              }}
              onMouseLeave={() => {
                setHoveredLegend(null);
                setShowMobileTooltip(false);
                setTooltipData(null);
              }}
              onClick={() => {
                setHoveredLegend('receitas');
                setShowMobileTooltip(true);
                setTooltipData({
                  x: 50,
                  y: 30,
                  month: 'Total de Receitas',
                  receitas: totalReceitas,
                  despesas: 0,
                  saldo: 0,
                });
              }}
            >
                <div className="w-3 h-2 rounded-sm bg-green-500"></div>
              <span className="text-gray-600 text-xs">Receitas</span>
            </div>
          )}
          {(mobileFilter === 'all' || mobileFilter === 'despesas') && (
            <div 
              className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity"
              onMouseEnter={() => {
                setHoveredLegend('despesas');
                setTooltipData({
                  x: 50,
                  y: 30,
                  month: 'Total de Despesas',
                  receitas: 0,
                  despesas: totalDespesas,
                  saldo: 0,
                });
              }}
              onMouseLeave={() => {
                setHoveredLegend(null);
                setShowMobileTooltip(false);
                setTooltipData(null);
              }}
              onClick={() => {
                setHoveredLegend('despesas');
                setShowMobileTooltip(true);
                setTooltipData({
                  x: 50,
                  y: 30,
                  month: 'Total de Despesas',
                  receitas: 0,
                  despesas: totalDespesas,
                  saldo: 0,
                });
              }}
            >
                <div className="w-3 h-2 rounded-sm bg-red-500"></div>
              <span className="text-gray-600 text-xs">Despesas</span>
            </div>
          )}
          {(mobileFilter === 'all' || mobileFilter === 'saldo') && (
            <div 
              className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity"
              onMouseEnter={() => {
                setHoveredLegend('saldo');
                setTooltipData({
                  x: 50,
                  y: 30,
                  month: 'Saldo Acumulado',
                  receitas: 0,
                  despesas: 0,
                  saldo: totalSaldo,
                });
              }}
              onMouseLeave={() => {
                setHoveredLegend(null);
                setShowMobileTooltip(false);
                setTooltipData(null);
              }}
              onClick={() => {
                setHoveredLegend('saldo');
                setShowMobileTooltip(true);
                setTooltipData({
                  x: 50,
                  y: 30,
                  month: 'Saldo Acumulado',
                  receitas: 0,
                  despesas: 0,
                  saldo: totalSaldo,
                });
              }}
            >
                <div className="w-5 h-0.5 bg-blue-500"></div>
              <span className="text-gray-600 text-xs">Saldo</span>
            </div>
          )}
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('❌ [FinancialEvolution] Erro no componente:', error);
    return (
      <div className="bg-white rounded-lg shadow border h-full p-6 flex items-center justify-center">
        <div className="text-center text-red-600">
          <p>Erro no componente</p>
          <p className="text-sm mt-1">{String(error)}</p>
        </div>
      </div>
    );
  }
};

export default FinancialEvolution;
