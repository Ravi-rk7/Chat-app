import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import cloudinary from "../lib/cloudinary.js";


export  const getUsersForSidebar = async (req,res)=>{
    try {
        const loggedInUserId = req.user._id;
        const filterdUsers = await User.find({_id:{$ne:loggedInUserId}}).select("-password");
        
        res.status(200).json({filterdUsers});

    } catch (error) {
        console.log("Error in getUsersForSidebar: ",error.meassage);
        res.status(500).json({meassage:"Internal server error!"});
    }
};

export const getMessages = async (req,res)=>{
    try {
        const {id:userToChatId} = req.params;
        const myId = req.user._id;

        const messages = await Message.find({
            $or:[
                {senderId:myId,recieverId:userToChatId},
                {senderId:userToChatId,recieverId:myId}
            ]
        });

        res.status(200).json(messages);

    } catch (error) {
        console.log("Error in getMessages: ",error.meassage);
        res.status(500).json({meassage:"Internal server error!"});
    }
}

export const sendMessage = async(req,res)=>{
    try {
        const {text,image} = req.body;
        const {id : recieverId} = req.params;
        const senderId = req.user._id;

        let imageUrl ;
        if(image){
            const uploadResponse = await cloudinary.uploader.upload(image);
            imageUrl = uploadResponse.secure_url;
        }

        const newMessage = new Message({
            text,
            image:imageUrl,
            recieverId,
            senderId
        });

        await newMessage.save();
        res.status(201).json(newMessage);

    } catch (error) {
        console.log("Error in sendMessage: ",error.meassage);
        res.status(500).json({meassage:"Internal server error!"});
    }
}