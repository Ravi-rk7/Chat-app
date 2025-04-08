import { useEffect } from 'react'

import Navbar from './components/Navbar';
import {Routes,Route, Navigate} from "react-router-dom";

import SignUpPage from "./pages/SignUpPage.jsx";
import HomePage from './pages/HomePage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import LogInPage from './pages/LogInPage.jsx';

import { useAuthStore } from './store/useAuthStore.js';
import {Loader} from "lucide-react";
import {Toaster} from "react-hot-toast";
import { useThemeStore } from './store/useThemeStore.js';


const App = () => {
  const {theme} = useThemeStore();
  const {authUser,checkAuth,isCheckingAuth} = useAuthStore(); 
  useEffect(()=>{
    checkAuth();
  },[checkAuth]);

  if (isCheckingAuth && !authUser){ 
    return (
    <div className='flex items-center justify-center h-screen'>
      <Loader className="size-10 animate-spin" />
    </div>
    );
  }

  console.log({authUser});

  return (
    <div data-theme={theme}>
      <Navbar/>

      <Routes>
        <Route path='/' element={authUser?<HomePage/>:<Navigate to="/login"/>}/>
        <Route path='/signup' element={!authUser ? <SignUpPage/> : <Navigate to="/"/>}/>
        <Route path='/login' element={!authUser ? <LogInPage/> : <Navigate to="/"/>}/>
        <Route path='/settings' element={<SettingsPage/>}/>
        <Route path='/profile' element={authUser ? <ProfilePage/> : <Navigate to="/login"/>}/>
      </Routes>

    <Toaster />
    </div>
  );
}

export default App;