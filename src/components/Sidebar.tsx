import { 
  LayoutDashboard, 
  PiggyBank, 
  FileText, 
  CreditCard, 
  Calculator
} from 'lucide-react'

interface SidebarProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

const Sidebar = ({ activeTab, onTabChange }: SidebarProps) => {


  const handleTabChange = (tab: string) => {
    onTabChange(tab)
  }

  const handleDashboardClick = () => {
    handleTabChange('dashboard')
  }

  const handleTransactionsClick = () => {
    handleTabChange('transactions')
  }

  const handleReportsClick = () => {
    handleTabChange('budgets')
  }

  const handleSettingsClick = () => {
    handleTabChange('settings')
  }






  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-64 bg-white border-r border-gray-200 min-h-screen">
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">F</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">FinTrack</div>
          </div>

          <nav className="space-y-2" aria-label="Navegação principal">
            <button 
              onClick={handleDashboardClick}
              aria-current={activeTab === 'dashboard' ? 'page' : undefined}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                activeTab === 'dashboard' 
                  ? 'bg-green-50 text-green-700' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <div className="w-6 h-6">
                <img 
                  src="/home.png" 
                  alt=""
                  className="w-6 h-6"
                />
              </div>
              <span className="font-medium">Dashboard</span>
            </button>
            
            <button 
              onClick={handleTransactionsClick}
              aria-current={activeTab === 'transactions' ? 'page' : undefined}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                activeTab === 'transactions' 
                  ? 'bg-green-50 text-green-700' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <div className="w-6 h-6 flex items-center justify-center">
                <img 
                  src="/money-bag.png" 
                  alt=""
                  className="w-6 h-6"
                />
              </div>
              <span className="font-medium">Transações</span>
            </button>
            
            <button 
              onClick={handleReportsClick}
              aria-current={activeTab === 'budgets' ? 'page' : undefined}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                activeTab === 'budgets' 
                  ? 'bg-green-50 text-green-700' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <div className="w-6 h-6 flex items-center justify-center">
                <img 
                  src="/research.png" 
                  alt=""
                  className="w-6 h-6"
                />
              </div>
              <span className="font-medium">Relatórios</span>
            </button>
            
            <button 
              onClick={handleSettingsClick}
              aria-current={activeTab === 'settings' || activeTab === 'admin' ? 'page' : undefined}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                activeTab === 'settings' 
                  ? 'bg-green-50 text-green-700' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <div className="w-6 h-6 flex items-center justify-center">
                <img 
                  src="/settings.png" 
                  alt=""
                  className="w-6 h-6"
                />
              </div>
              <span className="font-medium">Configurações</span>
            </button>
            
          </nav>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg mobile-bottom-nav">
        <div className="px-2 py-2">
          <nav className="flex justify-around items-center" aria-label="Navegação móvel">
            <button 
              onClick={handleDashboardClick}
              aria-current={activeTab === 'dashboard' ? 'page' : undefined}
              className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-lg transition-colors ${
                activeTab === 'dashboard' 
                  ? 'bg-green-50 text-green-700' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="w-7 h-7">
                <img 
                  src="/home.png" 
                  alt=""
                  className="w-7 h-7"
                />
              </div>
              <span className="text-xs font-medium">Dashboard</span>
            </button>
            
            <button 
              onClick={handleTransactionsClick}
              aria-current={activeTab === 'transactions' ? 'page' : undefined}
              className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-lg transition-colors ${
                activeTab === 'transactions' 
                  ? 'bg-green-50 text-green-700' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="w-7 h-7 flex items-center justify-center">
                <img 
                  src="/money-bag.png" 
                  alt=""
                  className="w-7 h-7"
                />
              </div>
              <span className="text-xs font-medium">Transações</span>
            </button>
            
            <button
              onClick={handleReportsClick}
              aria-current={activeTab === 'budgets' ? 'page' : undefined}
              className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-lg transition-colors ${
                activeTab === 'budgets' 
                  ? 'bg-green-50 text-green-700' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="w-7 h-7 flex items-center justify-center">
                <img 
                  src="/research.png" 
                  alt=""
                  className="w-7 h-7"
                />
              </div>
              <span className="text-xs font-medium">Relatórios</span>
            </button>
            
            <button 
              onClick={handleSettingsClick}
              aria-current={activeTab === 'settings' || activeTab === 'admin' ? 'page' : undefined}
              className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-lg transition-colors ${
                activeTab === 'settings' 
                  ? 'bg-green-50 text-green-700' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="w-7 h-7 flex items-center justify-center">
                <img 
                  src="/settings.png" 
                  alt=""
                  className="w-7 h-7"
                />
              </div>
              <span className="text-xs font-medium">Configurações</span>
            </button>
            
          </nav>
        </div>
      </div>
    </>
  )
}

export default Sidebar
