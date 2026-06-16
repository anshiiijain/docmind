// src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Documents from './pages/Documents'
import Analytics from './pages/Analytics'
import Navbar from './components/Navbar'
import Landing from './pages/Landing'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import ProtectedRoute from '@/components/ProtectedRoute'
import DashboardLayout from '@/components/DashboardLayout'
import Chat from '@/pages/Chat'
import Tasks from '@/pages/Tasks'
import { Toaster } from 'react-hot-toast'

export default function App() {
  return (
    <BrowserRouter>
    <Toaster position="top-right" />
      <Navbar />  {/* ← sits above all routes */}
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <DashboardLayout><Dashboard /></DashboardLayout>
          </ProtectedRoute>
        } />
        <Route path="/documents" element={
          <ProtectedRoute>
            <DashboardLayout><Documents /></DashboardLayout>
          </ProtectedRoute>
        } />
        <Route path="/analytics" element={
          <ProtectedRoute>
            <DashboardLayout><Analytics /></DashboardLayout>
          </ProtectedRoute>
        } />
        <Route path="/chat" element={
          <ProtectedRoute><DashboardLayout>
            <Chat />
          </DashboardLayout></ProtectedRoute>} />
        <Route path="/tasks" element={
          <ProtectedRoute><DashboardLayout>
            <Tasks />
          </DashboardLayout></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  )
}



