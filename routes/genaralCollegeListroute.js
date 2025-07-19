const express = require('express');
const router = express.Router();
require('dotenv').config();
const {generalCollegeList} = require('../database/schema');

router.get('/',(req, res)=>{
    res.render('genaralCollegeList');
});

router.post('/payment/store',async (req, res)=>{
    try {

        const data = req.body;

        const GeneralCollegeList = new generalCollegeList({
            name: data.name,
            email:data.email,
            phone: data.phone,
            razorpay_payment_id: data.razorpay_payment_id,
            razorpay_order_id: data.razorpay_order_id,
            plan: data.plan,
            caste: data.caste,
            gender: data.gender,
            percentileRange: data.percentileRange
        })

        await GeneralCollegeList.save();
        let pdfLink = "aaaaaaaaaaaaa";
        res.json({isOk: true,  pdfLink:pdfLink});
        
    } catch (error) {
        console.log(error);
    }
});




module.exports = router;