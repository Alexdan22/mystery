//jshint esversion:6
require('dotenv').config()
const express = require("express");
const ejs = require("ejs");
const mongoose = require('mongoose');
const encrypt = require("mongoose-encryption");
const cookieParser = require("cookie-parser");
const session = require('express-session');
const path = require('path');
const cors = require('cors');
const schedule = require('node-schedule');
const { DateTime } = require('luxon');
const xlsx = require('xlsx');
const fs = require('fs');
const app = express();
const QRCode = require('qrcode');
const WebSocket = require('ws');

app.set('view engine', 'ejs');

app.use(cors())

app.use(express.urlencoded({extended: true}));
app.use(express.json());

app.use(express.static("public"));

app.use(cookieParser());

app.use(session({
    secret: process.env.RANDOM,
    saveUninitialized:false,
    resave: false
}));

mongoose.set('strictQuery', false);
// mongoose.connect("mongodb://localhost:27017/mysteryDB");
mongoose.connect("mongodb+srv://alex-dan:Admin-12345@cluster0.wirm8.mongodb.net/mysteryDB");


const timeZone = 'Asia/Kolkata';
const currentTimeInTimeZone = DateTime.now().setZone(timeZone);


let d = new Date();
let year = currentTimeInTimeZone.year;
let month = currentTimeInTimeZone.month;
let date = currentTimeInTimeZone.day;
let hour = currentTimeInTimeZone.hour;
let minutes = currentTimeInTimeZone.minute;
let seconds = d.getSeconds();




const earningSchema = new mongoose.Schema({
  balance: Number,
  totalProfit: Number,
  totalReturn: Number,
  totalCommission: Number,
  profit: Number,
  returns: Number,
  commission: Number
});
const transactionSchema = new mongoose.Schema({
  type: String,
  from: String,
  amount: Number,
  status: String,
  time:{
    date: String,
    month: String,
    year: String
  },
  trnxId: String
});
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },

  email: {
    type: String,
    required: true
  },

  mobile: Number,

  userID: {
    type: String,
    required: true
  },

  tradeClose: Boolean,

  password: {
    type: String,
    required: true
  },

  apiToken: String,

  sponsorID: String,

  earnings: earningSchema,

  transaction: [transactionSchema],

  status: String,

  promo: String,

  coupon: String,

  package: {
    validity: Number,
    status: String,
    time:{
      date:Number,
      month:Number,
      year: Number
    }
  },

  time: {
    date: String,
    month: String,
    year: String
  }

});
const adminSchema = new mongoose.Schema({
  email: String,
  payment:[
    {
      trnxId: String,
      email: String,
      amount: Number,
      username: String,
      time:{
        date: String,
        month: String,
        year: String,
        minutes: String,
        hour: String
      },
      status: String
    }
  ],
  withdrawal:[
    {
      trnxId: String,
      email: String,
      amount: Number,
      username: String,
      time:{
        date: String,
        month: String,
        year: String,
        minutes: String,
        hour: String
      },
    }
  ]
});
const paymentSchema = new mongoose.Schema({
    rrn: Number,
    email: String,
    amount: Number,
    upi: String,
    payment_id: { type: String, required: true, unique: true },
    time:{
      date: String,
      month: String,
      year: String,
      minutes: String,
      hour: String
    },
    status: String
});
const apiTokenSchema = new mongoose.Schema({
  apiToken: String,
  email: String,
  fullname: String,
  scope:[String],
  user_id: Number,
  readyForTrade: Boolean
});
const profitSchema = new mongoose.Schema({
  email: String,
  name: String,
  apiToken: String,
  balance: Number,
  stake: Number,
  profitThreshold: Number,
  pnl: Number,
  trades:[
    {
      call: String,
      entry_price: Number,
      exit_price: Number,
      status: String,
      profit: Number
    }
  ],
  date: String,
  uniqueDate: String
});
const qrDataSchema = new mongoose.Schema({ text: String });



userSchema.plugin(encrypt, {secret:process.env.SECRET, encryptedFields: ['password'] });

const User = new mongoose.model("User", userSchema);

const Admin = new mongoose.model("Admin", adminSchema);

const Payment = new mongoose.model("Payment", paymentSchema);

const Data = new mongoose.model('Data', qrDataSchema);

const Api = new mongoose.model('Api', apiTokenSchema);

const Threshold = new mongoose.model('Threshold', profitSchema);


//Automated Functions
var job = schedule.scheduleJob('30 1 * * *', async(scheduledTime) => {
  try {
    const cooldown = await User.find({status: 'Active'});
    for (const users of cooldown) {
      if (users.package.status === 'Active') {
        users.package.validity -= 1;
        if (users.package.validity === 0) {
          users.status = 'Inactive';
          users.package.status = 'Expired';
        }
      }
    }
  } catch (error) {
    console.log(error);
  }
});


//ROUTES
app.get("/", async (req, res) =>{
  const alert = "false";
  // const users = await User.find({status:'Active'});

  // users.forEach(async user => {
  //   console.log(`User email: ${user.email} :- ${user.password}`);
    
  // })
  
  res.render("home", {alert});
});

app.get("/login", function(req, res){
  const alert = "false";
  res.render("login", {alert});
});

app.get("/sign-up", function(req, res) {
  const alert = "false";

  res.render("sign-up", {
    alert
  });
});

app.get("/dashboard", async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  let year = currentTimeInTimeZone.year;
  let month = currentTimeInTimeZone.month;
  let date = currentTimeInTimeZone.day;

  const foundUser = await User.findOne({ email: req.session.user.email });
  if (!foundUser) {
    return res.redirect("/login");
  }

  const { name, email, userID, earnings, status, time, package, apiToken } = foundUser;
  const alert = "nil";
  let responseSent = false;

  try {
    if (!apiToken) {
      return res.render("dashboard", { name, email, userID, earnings, package, alert, time, status, profit: null, tradeClose: foundUser.tradeClose || false });
    }

    const ws = new WebSocket("wss://ws.binaryws.com/websockets/v3?app_id=1089");
    

    ws.on("open", () => {
      ws.send(JSON.stringify({ authorize: apiToken }));
    });

    ws.on("message", async (data) => {
      if (responseSent) return; 

      try {
        const response = JSON.parse(data);

        if (!response.authorize) {
          responseSent = true;
          return;
        }

        const { balance } = response.authorize;
        if (balance !== undefined) {
          foundUser.earnings.balance = balance;
          await foundUser.save();
        }

        responseSent = true;
      } catch (error) {
        responseSent = true;
      } finally {
        setTimeout(() => ws.close(), 1000);
      }
    });

    ws.on("error", () => {
      if (!responseSent) responseSent = true;
    });

    ws.on("close", () => {});

  } catch (err) {}
  const uniqueDate = `${date}-${month}-${year}_${apiToken}`;
  const profit = await Threshold.findOne({uniqueDate})

  res.render("dashboard", { name, email, userID, earnings, package, alert, time, status, profit: profit || null, tradeClose: foundUser.tradeClose || false  });
});

app.get("/profile", async (req, res) =>{
  if (!req.session.user) {
    return res.redirect("/login");
  }
  try {
    const foundUser = await User.findOne({ email: req.session.user.email });
    if (!foundUser) {
      return res.redirect("/login");
    }
    
    const {
      name,
      email,
      mobile,
      status,
      userID,
      package,
      apiToken
    } = foundUser;


    res.render('profile', {
        name, 
        email,
        mobile: mobile || null, 
        userID,
        status,
        package,
        apiToken: apiToken || null
    });


  } catch (err) {
    console.log(err);
    res.status(500).send("An error occurred. Please try again later.");
  }

});

app.get("/pricing", async (req, res) =>{
  if (!req.session.user) {
    return res.redirect("/login");
  }
  try {
    const foundUser = await User.findOne({ email: req.session.user.email });
    if (!foundUser) return res.redirect("/login");
    
    const { name, email, status, userID, mobile, coupon } = foundUser;
    
    res.render("pricing", {
      name,
      email,
      mobile: mobile || null,
      coupon: coupon || null,
      userID,
      status,
    });

  } catch (err) {
    console.log(err);
    res.status(500).send("An error occurred. Please try again later.");
  }

});

app.get("/paymentGateway", async (req, res) =>{
  if (!req.session.user) {
    res.redirect("/login");
  } else {
    try {
        const { amount, promo, promoter } = req.query; // Extract query parameters

      const foundUser = await User.findOne({ email: req.session.user.email });
      if (foundUser) {
        let data = await Data.findOne({});
        if (!data) {
          data = new Data({ text: "dummy@upiId" });
          await data.save();
          res.redirect('/dashboard');
        } else {
            res.render("payment", {
                name: foundUser.username,
                email: foundUser.email,
                amount,
                promo,
                promoter,
                userID:foundUser.userID,
                alert: 'nil',
                upiId: data.text,
                status: foundUser.status
              });
        }
      }
    } catch (err) {
      console.log(err);
    }
  }
});

app.get('/generateQR', async (req, res) => {
  try {
    // Fetch data from MongoDB
    const amount = Number(req.query.amount);
    
    const data = await Data.findOne();
    if (!data) {
      const qr = new Data({
        text: "dummy@upiId"
      });
      qr.save();
      return res.status(404).send('No data found');
    }
    

    // Generate QR code
    if(!isNaN(amount) && amount > 0){
      
        const textToQr = `upi://pay?ver=01&mode=19&pa=${data.text}&pn=YUMEKO&tr=RZPYOlFEyT39ewjePiqrv2&cu=INR&mc=5651&qrMedium=04&tn=PaymenttoYUMEKO&am=${amount.toFixed(2)}`;
        QRCode.toDataURL(textToQr, (err, url) => {
          if (err) {
            return res.status(500).send('Error generating QR code');
          }
          res.status(200).send({ url });
        });
    }else{
    const textToQr = `upi://pay?ver=01&mode=19&pa=${data.text}&pn=YUMEKO&tr=RZPYOlFEyT39ewjePiqrv2&cu=INR&mc=5651&qrMedium=04&tn=PaymenttoYUMEKO`;
    QRCode.toDataURL(textToQr, (err, url) => {
      if (err) {
        return res.status(500).send('Error generating QR code');
      }
      res.status(200).send({ url });
    });  
    }
  } catch (error) {
    res.status(500).send('Server error');
    console.log(error)
  }
});

app.get("/log-out", function(req, res){
  req.session.destroy();
  res.redirect("/login");
});

app.get("/adminLogin", function(req, res){
  res.render("adminLogin");
});

app.get("/admin", async function(req, res) {
  if (!req.session.admin) {
    res.redirect("/adminLogin");
  } else {
    try {
      const foundAdmin = await Admin.findOne({ email: process.env.ADMIN });
      const foundUsers = await User.find({});
      const foundSwitch = await Switch.find({});
      const mode = foundSwitch[0];
      
      const total = foundUsers.length;
      const current = foundUsers.filter(activeUsers => activeUsers.status === 'Active');
      const currentUsers = current.length;

      
      res.render("admin", {
        total,
        currentUsers,
        mode,
        pendingApproval: foundAdmin.payment.length,
        pendingWithdraw: foundAdmin.withdrawal.length,
        payment: foundAdmin.payment,
        withdrawal: foundAdmin.withdrawal
      });
      
    } catch (err) {
      console.log(err);
    }
  }
});

app.get('/transaction', async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login");
  } else {
    const {type} = req.query; 

    try {

      const foundUser = await User.findOne({ email: req.session.user.email });
      const {name, email, status, userID, transaction} = foundUser;
      if (foundUser) {
        res.status(200).render('transaction',{
          name,
          email,
          userID,
          status,
          transactions: transaction,
          type,
          alert: 'nil'
        });
      }
    } catch (err) {
      console.log(err);
    }
  }
});

app.get('/activeUsers', async (req, res)=>{
  if(!req.session.admin){
    res.redirect('/adminLogin');
  }else{
    try {
      const activeUsers = await User.find({status: 'Active'});
      res.render('users', {
        activeUsers
      })
    } catch (err) {
      console.log(err);
      
    }
  }
});

app.get('/totalUsers', async (req, res)=>{
  if(!req.session.admin){
    res.redirect('/adminLogin');
  }else{
    try {
      const activeUsers = await User.find({});
      res.render('users', {
        activeUsers
      })
    } catch (err) {
      console.log(err);
      
    }
  }
});

app.get('/viewUser/:email', async (req, res)=>{
  if(!req.session.admin){
     res.redirect('/adminLogin');
  }else{
    const email = req.params.email;
    try {
      const foundUser = await User.findOne({email:email});
      if (!foundUser) {
        return res.redirect('/admin');
      }
      if(foundUser){
        req.session.user = { email: foundUser.email };
        res.redirect("/dashboard");
      }
  
    } catch (err) {
      console.log(err);
      
    }
  }
});

app.get('/download-mobile-numbers', async(req, res) => {
if(!req.session.admin){
  res.redirect('/admin');
}else{
  try {
      // Sample data, replace with your actual data
      const users = await User.find({});

      // Extract mobile numbers
      const mobileNumbers = users.map(user => ({"Name":user.username, "Email": user.email, "User ID": user.userID, "Mobile Number": `+91${user.mobile}`, "Total Earnings": user.earnings.total, "Available Balance": user.earnings.balance, "Status": user.status, "Sponsor ID": user.sponsorID }));

      // Create a new workbook
      const wb = xlsx.utils.book_new();

      // Convert data to a worksheet
      const ws = xlsx.utils.json_to_sheet(mobileNumbers);

      // Append the worksheet to the workbook
      xlsx.utils.book_append_sheet(wb, ws, 'Mobile Numbers');

      // Define the file path
      const filePath = path.join(__dirname, 'MobileNumbers.xlsx');

      // Write the workbook to the file
      xlsx.writeFile(wb, filePath);

      // Send the file for download
      res.download(filePath, 'MobileNumbers.xlsx', (err) => {
        if (err) {
          console.error('Error sending the file:', err);
          res.status(500).send('Could not download the file');
        }
        // Optional: Delete the file after download to save space
        fs.unlink(filePath, (err) => {
          if (err) {
            console.error('Error deleting the file:', err);
          }
        });
      });

  
  } catch (err) {
    console.log(err);
    
  }
}

});

app.get('/closeTrade' , async (req, res) => {
  const activeUsers = await User.find({status: 'Active'});
  let year = currentTimeInTimeZone.year;
  let month = currentTimeInTimeZone.month;
  let date = currentTimeInTimeZone.day;

  for (const user of activeUsers) {
    if(user.apiToken){
      const todayTradeClose = await Threshold.findOne({uniqueDate:`${date}-${month}-${year}_${user.apiToken}`});
      if(todayTradeClose){
        //Calculate Trade PnL

        //Update Api trade ready status
        const api = await Api.findOne({apiToken:user.apiToken});
        api.readyForTrade = false; 
        await api.save();

        //Update User balance 
        user.earnings.totalProfit += todayTradeClose.pnl;
        user.earnings.profit = todayTradeClose.pnl;
        user.earnings.returns = Math.floor(todayTradeClose.pnl * 0.60 * 100) / 100;
        user.earnings.commission = Math.floor(todayTradeClose.pnl * 0.40 * 100) / 100;
        user.earnings.totalReturn += Math.floor(todayTradeClose.pnl * 0.60 * 100) / 100;
        user.earnings.totalCommission += Math.floor(todayTradeClose.pnl * 0.40 * 100) / 100;
        user.tradeClose = true;
        user.transaction.push(
          {
            type: 'Credit',
            from: 'Profit',
            amount:todayTradeClose.pnl,
            status: 'Success',
            time: { date, month, year },
            trnxId
          },
          {
            type: 'Credit',
            from: 'Returns',
            amount: Math.floor(todayTradeClose.pnl * 0.60 * 100) / 100,
            status: 'Success',
            time: { date, month, year },
            trnxId
          }
      );
        await user.save();
      }
    }
  }
});



//POSTS
app.post('/api/register', async (req, res) => {
  const timeZone = 'Asia/Kolkata';
  const currentTimeInTimeZone = DateTime.now().setZone(timeZone);

  let year = currentTimeInTimeZone.year;
  let month = currentTimeInTimeZone.month;
  let date = currentTimeInTimeZone.day;
  let userID = "MT" + String(Math.floor(Math.random() * 999999));
  
  
  

  try {
    let foundUser = await User.findOne({ userID: userID });
    while (foundUser) {
      userID = "MT" + String(Math.floor(Math.random() * 999999));
      foundUser = await User.findOne({ userID: userID });
    }
    const newUser = new User({
        name: req.body.username,
        email: req.body.email,
        password: req.body.password,
        userID: userID,
        status: "Inactive",
        coupon: "Unused",
        earnings: {
            balance: 0,
            totalProfit: 0,
            totalReturn: 0,
            totalCommission: 0,
            profit: 0,
            returns: 0,
            commission: 0
        },
        time: {
          date: date,
          month: month,
          year: year
        },
        package: {
            validity: 0,
            status: "Inactive",
        },
        transaction: []
      });

    const existingUser = await User.findOne({ email: req.body.email });
    if (existingUser) {
      return res.status(200).send({
        alertType: "Warning",
        alert: "true",
        message: "The Email is already registered, Kindly login"
      });
    }else{
        await newUser.save();
        res.status(200).send({
          alertType: "Success",
          alert: "true",
          message: "Successfully created your Account"
        });
    }

    

    

  } catch (err) {
    console.log(err);
    res.status(500).send("Internal Server Error");
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const foundUser = await User.findOne({ email: req.body.email });

    if (!foundUser) {
      return res.status(200).send({
        alertType: "Warning",
        alert: "true",
        message: "Email or Password Invalid",
      });
    }

    if (req.body.password === foundUser.password) {
      req.session.user = req.body;
      return res.status(200).send({
        alertType: "Success",
        alert: "true",
        message: "Login successful...",
      });
    } else {
      return res.status(200).send({
        alertType: "Warning",
        alert: "true",
        message: "Email or Password Invalid",
      });
    }
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      alertType: "Error",
      alert: "true",
      message: "An error occurred. Please try again later.",
    });
  }
});

app.post('/check-promo', async (req, res) => {
    const { promo } = req.body;
    const validPromo = await User.findOne({promo});

    if (!validPromo) {
        res.json({ valid: false });
    } else {
        res.json({ valid: true });
    }
});

app.post('/submit-form', async (req, res) => {
  const foundUser = await User.findOne({email:req.session.user.email});
    const { name, email, mobile, promo, amount } = req.body;
    let newValue = amount * 0.80;

    if(!foundUser.mobile){
      await User.updateOne({email:foundUser.email}, {$set:{mobile: Number(mobile)}});
    }
    
    if(promo !== ""){
        const foundPromo = await User.findOne({promo});
        
        if(foundPromo){
            res.json({ success:true, name, email, mobile, promo, promoter:foundPromo.userID, amount: newValue});
        }else{
            res.json({ success:true, name, email, mobile, promo:null, promoter:null, amount});
        }

    }else{
        res.json({ success:true, name, email, mobile, promo:null, promoter:null, amount});
    }
});

app.post("/api/paymentVerification", async (req, res) => {
    const timeZone = 'Asia/Kolkata';
    const currentTime = DateTime.now().setZone(timeZone);
    const { year, month, day: date } = currentTime;
    const {trnxId, promo, promoter} = req.body;
    const amount = Number(req.body.amount);

    if (!req.session.user) {
        return res.status(200).send({ redirect: true });
    }

    if (!amount || !trnxId) {
        return res.status(200).send({ 
            alertType: "Warning", 
            alert: "true", 
            message: "Kindly fill all the given details" 
        });
    }

    if (String(trnxId).length !== 12) {
        return res.status(200).send({ 
            alertType: "Warning", 
            alert: "true", 
            message: "Enter valid UTR number" 
        });
    }

    try {
        const foundPayment = await Payment.findOne({ rrn: trnxId });

        if (!foundPayment) {
            return res.status(200).send({ 
                alertType: "Warning", 
                alert: "true", 
                message: "Invalid UTR number, Kindly enter the correct details" 
            });
        }

        if (foundPayment.status !== 'captured') {
            return res.status(200).send({ 
                alertType: "Warning", 
                alert: "true", 
                message: "Transaction already processed." 
            });
        }

        if (foundPayment.amount !== amount) {
            
            return res.status(200).send({ 
                alertType: "Warning", 
                alert: "true", 
                message: "Amount and UTR number missmatch." 
            });
        }

        const foundUser = await User.findOne({ email: req.session.user.email });
        const foundPromoter = await User.findOne({promo});

        if (!foundUser) {
            return res.status(200).send({ 
                alertType: "Warning", 
                alert: "true", 
                message: "Unexpected error occurred, Kindly login again." 
            });
        }
        if(promo !== 'null'){
            if(foundUser.coupon !== 'redeemed'){
                foundPromoter.transaction.push({
                    type: 'Credit',
                    from: 'Affiliate',
                    amount: 1000,
                    status: 'Success',
                    time: { date, month, year },
                    trnxId
                });
                await foundPromoter.save();
            }
        }

        // Update package validity based on amount
        const validityMap = { 1490: 30, 1192: 30, 4500: 90, 7500: 180 };
        if (validityMap[amount]) {
            foundUser.package.validity += validityMap[amount];
            foundUser.status = "Active";
            foundUser.package.status = "Active";
            foundUser.coupon = 'redeemed';
            foundUser.package.time = { date, month, year };
            await foundUser.save();
            await foundUser.updateOne({email:foundUser.email}, {$set:{tradeClose:false}});
        }

        

        // Add transaction record
        foundUser.transaction.push({
            type: 'Paid',
            from: 'Maintenance',
            amount,
            status: 'Success',
            time: { date, month, year },
            trnxId
        });
        await foundUser.save();

        foundPayment.status = 'redeemed';
        foundPayment.email = foundUser.email;
        await foundPayment.save();

        return res.status(200).send({ 
            alertType: "Success", 
            alert: "true", 
            message: "Payment successful, Redirecting to dashboard..." 
        });

    } catch (err) {
        console.error(err);
        return res.status(500).send({ 
            alertType: "Error", 
            alert: "true", 
            message: "Internal server error" 
        });
    }
});

app.post("/api/commissionVerification", async (req, res) => {
  const timeZone = 'Asia/Kolkata';
  const currentTime = DateTime.now().setZone(timeZone);
  const { year, month, day: date } = currentTime;
  const {trnxId} = req.body;
  const foundUser = await User.findOne({ email: req.session.user.email });

  if (!req.session.user) {
      return res.status(200).send({ redirect: true });
  }

  if (!trnxId) {
      return res.status(200).send({ 
          alertType: "Warning", 
          alert: "true", 
          message: "Kindly fill all the given details" 
      });
  }

  if (String(trnxId).length !== 12) {
      return res.status(200).send({ 
          alertType: "Warning", 
          alert: "true", 
          message: "Enter valid UTR number" 
      });
  }

  try {
      const foundPayment = await Payment.findOne({ rrn: trnxId });

      if (!foundPayment) {
          return res.status(200).send({ 
              alertType: "Warning", 
              alert: "true", 
              message: "Invalid UTR number, Kindly enter the correct details" 
          });
      }

      if (foundPayment.status !== 'captured') {
          return res.status(200).send({ 
              alertType: "Warning", 
              alert: "true", 
              message: "Transaction already processed." 
          });
      }

      if (foundPayment.amount !== (foundUser.earnings.commission * 90)) {
        console.log(foundPayment.amount, foundUser.earnings.commission * 90);
        
          
          return res.status(200).send({ 
              alertType: "Warning", 
              alert: "true", 
              message: "Amount and UTR number missmatch." 
          });
      }

      if (!foundUser) {
          return res.status(200).send({ 
              alertType: "Warning", 
              alert: "true", 
              message: "Unexpected error occurred, Kindly login again." 
          });
      }
      const api = await Api.findOne({apiToken:foundUser.apiToken});
      
      foundUser.tradeClose = false;
      foundUser.earnings.profit = 0;
      foundUser.earnings.returns = 0;
      foundUser.earnings.commission = 0;
      
      api.readyForTrade = true;
      await api.save();

      

      // Add transaction record
      foundUser.transaction.push({
          type: 'Paid',
          from: 'Commission',
          amount:foundUser.earnings.commission * 90,
          status: 'Success',
          time: { date, month, year },
          trnxId
      });
      await foundUser.save();

      foundPayment.status = 'redeemed';
      foundPayment.email = foundUser.email;
      await foundPayment.save();

      return res.status(200).send({ 
          alertType: "Success", 
          alert: "true", 
          message: "Commission paid successfully" 
      });

  } catch (err) {
      console.error(err);
      return res.status(500).send({ 
          alertType: "Error", 
          alert: "true", 
          message: "Internal server error" 
      });
  }
});

app.post('/update-api-token', async (req, res) => {
  if (!req.session?.user?.email) {
    return res.status(400).json({ success: false, message: "User not logged in" });
  }

  const { apiToken } = req.body;
  if (!apiToken) {
    return res.status(400).json({ success: false, message: "API token is required" });
  }

  try {
    const ws = new WebSocket("wss://ws.binaryws.com/websockets/v3?app_id=1089");

    let responseSent = false;

    ws.on('open', () => {
      console.log('✅ WebSocket connected.');
      ws.send(JSON.stringify({ authorize: apiToken }));
    });

    ws.on('message', async (data) => {

      if (responseSent) return; // Prevent multiple responses

      try {
        const response = JSON.parse(data);

        if (!response.authorize) {
          console.error("❌ API token validation failed. Full response:", response);
          responseSent = true;
          return res.status(400).json({ success: false, message: "Invalid API token" });
        }

        const { email, fullname, scope, user_id, balance } = response.authorize;

        const apiAvailable = await Api.findOne({ email });
        if (!apiAvailable) {
          const newToken = new Api({
            apiToken,
            email,
            fullname,
            scope,
            user_id,
            readyForTrade: true
          });

          await newToken.save();
          const foundUser = await User.findOne({ email: req.session.user.email });

          if (foundUser) {
            if (balance !== undefined) {
              foundUser.earnings.balance = balance;
              await foundUser.save();
            }
          }
          await User.updateOne({ email: req.session.user.email }, { $set: { apiToken } });

          responseSent = true;
          res.json({ success: true, message: "API token updated successfully" });
        } else {
          responseSent = true;
          res.status(400).json({ success: false, message: "API token is already associated with another account." });
        }
      } catch (error) {
        if (!responseSent) {
          responseSent = true;
          res.status(500).json({ success: false, message: "Invalid WebSocket response format" });
        }
      } finally {
        setTimeout(() => {
          ws.close();
        }, 1000);
      }
    });

    ws.on('error', (err) => {
      console.error('❌ WebSocket error:', err);
      if (!responseSent) {
        responseSent = true;
        res.status(500).json({ success: false, message: "WebSocket error" });
      }
      ws.close();
    });

    ws.on('close', () => {
    });

  } catch (err) {
    console.error('❌ Internal Server Error:', err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

app.post('/update-mobile', async (req, res) => {
  if (!req.session.user || !req.session.user.email) {
    return res.status(400).json({ success: false, message: "User not logged in" });
  }

  try {
    const { mobile } = req.body;
    if (!mobile) {
      return res.status(400).json({ success: false, message: "Mobile number is required" });
    }

    await User.updateOne({ email: req.session.user.email }, { $set: { mobile: Number(mobile) } });
    res.json({ success: true, message: "Mobile number updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

app.post("/adminLogin", function(req, res){
  
  if(process.env.ADMIN === req.body.email){
    if(process.env.PASSWORD === req.body.password){
      req.session.admin = req.body;

      res.redirect('/admin');
    }else{
      //Not an User
      res.redirect('/adminLogin');
    }
  }else{
    //Not an User
    res.redirect('/adminLogin');
  }
});

app.post("/qrData", async (req, res) =>{
 if(!req.session.admin){
   res.redirect('/adminLogin');
 }else{
   try {
     // Fetch data from MongoDB
     const data = await Data.findOne();
     if (!data) {
       const qr = new Data({
         text: "dummy@upiId"
       });
       qr.save();
       res.redirect('/admin');
     }else{
           
       //Update QR or UPI details
       await Data.updateOne({}, {$set:{text:req.body.upi}});
       res.redirect('/admin');
     }
     

   } catch (error) {
     console.log(error);
   }

 }
});

app.post('/userPanel', async (req, res) => {
  if (!req.session.admin) {
    return res.redirect('/adminLogin');
  }

  try {
    const { type, input } = req.body;
    const foundUser = type === "email" 
      ? await User.findOne({ email: input }) 
      : await User.findOne({ userID: input });

    if (!foundUser) {
      return res.redirect('/admin');
    }

    req.session.user = { email: foundUser.email };
    res.redirect("/dashboard");

  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});










app.listen(process.env.PORT || 4000, function() {
  console.log("Server started on port 4000 | http://localhost:4000");
});
