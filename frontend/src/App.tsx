import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from 'antd'

// Pages
import Dashboard from './pages/Dashboard'
import TranslationWorkspace from './pages/TranslationWorkspace'
import DocumentManager from './pages/DocumentManager'
import TerminologyManager from './pages/TerminologyManager'
import Settings from './pages/Settings'
import DocumentEditor from './pages/DocumentEditor'
import TemplateManager from './pages/TemplateManager'
import BatchProcessor from './pages/BatchProcessor'
import Login from './pages/Auth/Login'

// Components
import AppHeader from './components/AppHeader'
import AppSidebar from './components/AppSidebar'
import LoadingSpinner from './components/LoadingSpinner'

// Hooks
import { useAppSelector } from './store'

const { Content } = Layout

const App: React.FC = () => {
  const { isAuthenticated, loading } = useAppSelector(state => state.auth)

  if (loading) {
    return <LoadingSpinner />
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <AppHeader />
      <Layout>
        <AppSidebar />
        <Layout style={{ padding: '0 24px 24px' }}>
          <Content
            style={{
              padding: 24,
              margin: 0,
              minHeight: 280,
              background: '#fff',
              borderRadius: 8,
            }}
          >
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/document-editor" element={<DocumentEditor />} />
              <Route path="/template-manager" element={<TemplateManager />} />
              <Route path="/translate" element={<TranslationWorkspace />} />
              <Route path="/documents" element={<DocumentManager />} />
              <Route path="/terminology" element={<TerminologyManager />} />
              <Route path="/batch" element={<BatchProcessor />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Content>
        </Layout>
      </Layout>
    </Layout>
  )
}

export default App
