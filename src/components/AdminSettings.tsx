import { useAuth } from '../contexts/AuthContext'

const AdminSettings = ({ onBack }: { onBack: () => void }) => {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Configuração do Sistema</h1>
          <button onClick={logout} className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700">
            Sair
          </button>
        </div>
        <button type="button" onClick={onBack} className="min-h-11 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">← Voltar para configurações</button>
        <p className="text-sm text-gray-600">Logado como: {user?.email}</p>
        <p className="text-gray-700">
          A conexão com o Firebase é definida pelas variáveis VITE_FIREBASE_* durante a compilação.
          Edite o arquivo .env.local no desenvolvimento ou as variáveis do Netlify em produção e publique novamente.
        </p>
        <p className="text-sm text-gray-600">
          O arquivo .env.example lista as variáveis disponíveis. As regras do Firestore devem ser publicadas no Firebase separadamente.
        </p>
      </div>
    </div>
  )
}

export default AdminSettings
