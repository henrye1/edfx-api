import { createBrowserRouter } from 'react-router-dom'
import { PortfolioList } from './screens/PortfolioList/PortfolioList'
import { PortfolioDetail } from './screens/PortfolioDetail/PortfolioDetail'
import { EntityDetail } from './screens/EntityDetail/EntityDetail'
import { UploadScreen } from './screens/Upload/UploadScreen'
import App from './App'

export const router = createBrowserRouter([
  { path: '/', element: <App />, children: [
    { index: true, element: <PortfolioList /> },
    { path: 'portfolio/:id', element: <PortfolioDetail /> },
    { path: 'entity/:id', element: <EntityDetail /> },
    { path: 'upload', element: <UploadScreen /> },
  ] },
])
