import { generateToken } from "../lib/utils.js";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";


export const signup = async (req,res)=>{
    const {fullName,password,email} = req.body;
    try {
        
        if(!fullName || !password || !email){
            return res.status(400).json({message:"All fields are required!"});
        }
        
        if(password.length < 6){
            return res.status(400).json({message:"Password must be at least 6 characters !"});
        }
        
        const user = await User.findOne({email});
        if(user) return res.status(400).json({message:"Email already exists !"});
        
        // hashing passwords 
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password,salt);

        const newUser = new User({
            email: email,
            fullName: fullName,
            password: hashedPassword,
        });

        if(newUser){
            //generate JWT token here
            generateToken(newUser._id,res);
            await newUser.save();

            res.status(201).json({
                _id:newUser._id,
                fullName: newUser.fullName,
                email: newUser.email,
                profilePic:newUser.profilePic,
            });

        }else{
            return res.status(400).json({message:"Invalid user data!"});
        }

    } catch (error) {
        console.log(`Error in Signup Controller: ${error.message}`);
        res.status(500).json({message:"Internal server error!"});
    }
};

export const login = async (req,res)=>{
    const {email,password} = req.body;
    try {
        const user = await User.findOne({email});

        if(!user){
            return res.status(400).json({message:"Invalid credentials!"});
        }

        const isPasswordCorrect = await bcrypt.compare(password,user.password);

        if(!isPasswordCorrect){
            return res.status(400).json({message:"Invalid credentials!"});
        }

        generateToken(user._id,res);

        res.status(200).json({
            _id:user._id,
            fullName:user.fullName,
            email:user.email,
            profilePic:user.profilePic
        });

    } catch (error) {
        console.log(`Error in Login Controller: ${error.message}`);
        res.status(500).json({message:"Internal server error!"});
    }
}

export const logout = (req,res)=>{
    res.send("logout route!");
}