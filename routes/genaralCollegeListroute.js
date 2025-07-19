const express = require('express');
const router = express.Router();
require('dotenv').config();
const {generalCollegeList, generalPdf} = require('../database/schema');
const axios = require('axios');



router.get('/',(req, res)=>{
    res.render('genaralCollegeList');
});


router.get('/razorPay',(req, res)=>{
    // const amount = req.session.userPaymentInfo.amount;
    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    res.json({razorpayKeyId});
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
        
        // let pdfLink = `http://localhost:3000/download/upload/pdf/${data.pdf_id}`;
        let pdfLink = `https://list.campusdekho.ai/download/upload/pdf/${pdfID}`;
        await sendCollegePreferenceList(data.phone,  data.name, pdfLink);
        
        res.json({isOk: true,  pdfLink: pdfLink});
        
    } catch (error) {
        console.log(error);
    }
});


router.get('/download-pdf/:pdfId', async (req, res) => {
    try {
        const pdf = await generalPdf.findById(req.params.pdfId);
        
        if (!pdf) {
            return res.status(404).send('PDF not found');
        }


        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="college-list-${pdf._id}.pdf"`,
            'Content-Length': pdf.pdf.length
        });

        // Send the PDF buffer
        res.send(pdf.pdf);
    } catch (error) {
        console.error('Error downloading PDF:', error);
        res.status(500).send('Error downloading PDF');
    }
});




async function sendCollegePreferenceList(mobileNumber, name, listLink) {
    console.log("sendCollegePreferenceList trigger");
    const templateName = "preference_list"; // Your template name approved in WATI
    // console.log(mobileNumber, name, listLink);

    mobileNumber = `91${mobileNumber}`;
    const CHANNEL_NUMBER = process.env.CHANNEL_NUMBER;
    const END_POINT = process.env.WATI_ENDPOINT;
    const ACCESS_TOKEN = process.env.WATI_ACCESS_TOKEN;
    // console.log(CHANNEL_NUMBER, END_POINT, ACCESS_TOKEN);

    const data = {
        template_name: templateName,
        broadcast_name: "College Preference Notification",
        receivers: [
            {
                whatsappNumber: mobileNumber,
                customParams: [
                    {
                        name: 'name', // matches {{name}} in template
                        value: name
                    },
                    {
                        name: 'listlink', // matches {{listlink}} in template
                        value: listLink
                    }
                ]
            }
        ],
        channel_number: CHANNEL_NUMBER
    };

    const endpoint = `${END_POINT}/api/v1/sendTemplateMessages`;
    
    // console.log('Sending WhatsApp template:', { endpoint, payload: data });

    try {
        const response = await axios.post(endpoint, data, {
            headers: {
                'Authorization': `Bearer ${ACCESS_TOKEN}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        return {
            success: true,
            status: response.status,
            data: response.data
        };
    } catch (error) {
        console.error('WhatsApp API Error:', error.response?.data || error.message);
        return {
            success: false,
            error: error.response?.data || error.message
        };
    }
}




module.exports = router;