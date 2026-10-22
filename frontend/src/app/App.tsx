import { MainLayout } from './layouts/MainLayout'
import { BrowserRouter } from 'react-router'
import { AppRoutes } from './router'

export default function App() {
  
  return (
    <BrowserRouter>
      <MainLayout> 
         <AppRoutes />
      </MainLayout>
    </BrowserRouter>
  )
}
