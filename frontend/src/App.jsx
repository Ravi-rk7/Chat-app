import React, { useEffect } from 'react'
import Navbar from './components/Navbar';
import {Routes,Route} from "react-router-dom";
import SignUpPage from "./pages/SignUpPage.jsx";
import HomePage from './pages/HomePage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import LogInPage from './pages/LogInPage.jsx';
import { useAuthStore } from './store/useAuthStore.js';
import {Loader} from "lucide-react";



const App = () => {

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
    <div >
      <Navbar/>

      <Routes>
        <Route path='/' element={<HomePage/>}/>
        <Route path='/signup' element={<SignUpPage/>}/>
        <Route path='/login' element={<LogInPage/>}/>
        <Route path='/settings' element={<SettingsPage/>}/>
        <Route path='/profile' element={<ProfilePage/>}/>
      </Routes>

    </div>
  )
}

export default App;