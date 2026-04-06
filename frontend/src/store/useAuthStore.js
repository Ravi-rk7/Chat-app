import  { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import {io} from "socket.io-client";
import { SOCKET_URL } from "../lib/env.js";

const getErrorMessage = (error, fallback) =>
    error?.response?.data?.message || fallback;

export const useAuthStore = create((set,get)=>({
    authUser:null,
    isSigningUp : false,
    isLoggingIn:false,
    isUpdatingProfile:false,
    isCheckingAuth : true,
    onlineUsers : [],
    socket: null,
    
    checkAuth: async()=>{
        try {
            const res = await axiosInstance.get("/auth/check");
            set({authUser:res.data});

            get().connectSocket();

        } catch (error) {
            console.log("Error in checkAuth: ", error);
            get().disconnectSocket();
            set({authUser:null, socket:null, onlineUsers:[]});
        } finally {
            set({isCheckingAuth:false}); 
        }
    },
    signup: async (data)=>{
        set({isSigningUp:true});
        try {
           const res = await axiosInstance.post("/auth/signup",data);
           set({authUser:res.data});
           toast.success("Account created successfully!");

           get().connectSocket();
        } catch (error) {
            toast.error(getErrorMessage(error,"Unable to create your account right now."));
        } finally{
            set({isSigningUp:false});
        }
    },

    login: async (data)=>{
        set({isLoggingIn:true});
        try {
            const res = await axiosInstance.post("/auth/login",data);
            set({authUser : res.data});
            toast.success("Logged in successfully!");

            get().connectSocket();
        } catch (error) {
            toast.error(getErrorMessage(error,"Unable to sign you in right now."));
        } finally{
            set({isLoggingIn:false});
        }

    },
    
    logout: async () =>{
        try {
            await axiosInstance.post("/auth/logout");
            set({authUser:null});
            toast.success("Logged out successfully!");
            get().disconnectSocket();
        } catch (error) {
            return toast.error(getErrorMessage(error,"Unable to log out right now."));
        }
    },

    updateProfile: async(data)=>{
        try {
            set({isUpdatingProfile:true});
            const res = await axiosInstance.put("/auth/update-profile",data);
            set({authUser:res.data});
            toast.success("Profile updated successfully!");

        } catch (error) {
            console.log("Error in Update profile: ",error);
            toast.error(getErrorMessage(error,"Unable to update your profile right now."));
        } finally {
            set({isUpdatingProfile:false});
        }
    },
    connectSocket: ()=>{
        const {authUser} = get();
        if(!authUser || get().socket?.connected ){
            return;
        }
        if(get().socket){
            get().socket.disconnect();
        }

        const socket = io(SOCKET_URL,{
            query: {
                userId : authUser._id,
            },
            withCredentials: true,
        });

        socket.connect();
        set({socket:socket});

        socket.on("onlineUsers",(userIds)=>{
            set({onlineUsers:userIds.map(String)});
        });

        socket.on("disconnect",()=>{
            set({socket:null, onlineUsers:[]});
        });
    },
    disconnectSocket: ()=>{
        if(get().socket?.connected) get().socket.disconnect();
        set({socket:null, onlineUsers:[]});
    }
}));
