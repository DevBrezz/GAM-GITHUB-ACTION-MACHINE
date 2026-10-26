import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Overview from './pages/Overview'
import NewBuild from './pages/NewBuild'
import BuildDetail from './pages/BuildDetail'
import BuildHistory from './pages/BuildHistory'
import Artifacts from './pages/Artifacts'
import Settings from './pages/Settings'
import Docs from './pages/Docs'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/new" element={<NewBuild />} />
        <Route path="/builds" element={<BuildHistory />} />
        <Route path="/builds/:id" element={<BuildDetail />} />
        <Route path="/artifacts" element={<Artifacts />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/docs" element={<Docs />} />
      </Routes>
    </Layout>
  )
}
