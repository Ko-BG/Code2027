const express = require("express");
const multer = require("multer");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));
app.use(express.static("public"));

/* ---------------- DATABASE ---------------- */
mongoose.connect(process.env.MONGO_URL || "mongodb://127.0.0.1/adak", {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(()=>console.log("MongoDB Connected"));

/* ---------------- MODELS ---------------- */
const User = mongoose.model("User", new mongoose.Schema({
  name:String,
  email:String,
  password:String,
  role:String
}));

const Evidence = mongoose.model("Evidence", new mongoose.Schema({
  filename:String,
  original:String,
  date:{type:Date,default:Date.now}
}));

/* ---------------- AUTH ---------------- */
app.post("/api/signup", async(req,res)=>{
  const hash = await bcrypt.hash(req.body.password,10);
  const user = await User.create({...req.body,password:hash});
  res.json({success:true});
});

app.post("/api/login", async(req,res)=>{
  const user = await User.findOne({email:req.body.email});
  if(!user) return res.json({error:"User not found"});
  const ok = await bcrypt.compare(req.body.password,user.password);
  if(!ok) return res.json({error:"Wrong password"});
  res.json({success:true,role:user.role,name:user.name});
});

/* ---------------- UPLOADS ---------------- */
const storage = multer.diskStorage({
 destination:"uploads/",
 filename:(req,file,cb)=>{
   cb(null,Date.now()+"-"+file.originalname);
 }
});
const upload = multer({storage});

app.post("/api/upload", upload.single("file"), async(req,res)=>{
  const record = await Evidence.create({
    filename:req.file.filename,
    original:req.file.originalname
  });
  res.json(record);
});

app.get("/api/evidence", async(req,res)=>{
  const files = await Evidence.find().sort({date:-1});
  res.json(files);
});

/* ---------------- START ---------------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>console.log("Server running on",PORT));