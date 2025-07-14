
const express = require('express');
const router = express.Router();
const {connectDB, supabase} = require('../database/db');
const {Pdf, Payment} = require('../database/schema');


const central_object = {
    percentile: 0
}

router.get('/', async (req, res) => {

    // console.log(req.session.userPaymentInfo);
    if(req.session.userPaymentInfo){
        res.render('pharmacyCollegeList', { razorpayKeyId: process.env.RAZORPAY_KEY_ID , price: req.session.userPaymentInfo.amount});
    }else{
        res.redirect('/');
    }
});

router.get('/',(req,res)=>{
    res.render('pharmacyCollegeList', { razorpayKeyId: process.env.RAZORPAY_KEY_ID , price: 500}); //req.session.userPaymentInfo.amount
});

router.get('/takePaymentInfo',(req, res)=>{
    const userPaymentInfo = req.session.userPaymentInfo;
    res.json(userPaymentInfo);
});

router.get('/fetchcity', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('phamacy_college_info')
            .select('city')
            .not('city', 'is', null)
            .order('city', { ascending: true });
        
        if (error) throw error;
        
        // Trim city names and get distinct values
        const distinctCities = [...new Set(data.map(item => item.city.trim()))];
        res.json(distinctCities.map(city => ({ city })));
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Failed to fetch cities' });
    }
});

router.get('/fetchUniversity', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('phamacy_college_info')
            .select('university')
            .not('university', 'is', null)
            .order('university', { ascending: true });
        
        if (error) throw error;
        
        // Get distinct universities
        const distinctUniversities = [...new Set(data.map(item => item.university))];
        res.json(distinctUniversities.map(univ => ({ university: univ })));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch universities' });
    }
});


const new_data_of_student = {
    caste_name : '',
    caste_Column_S: '',
    caste_Column_O: '',
    caste_Column_H: '',
    specialReservation: '',
    minRank : 0,
    maxRank : 0,
};

function calculateRankRange(rank) {
    // console.log(rank);
    let minRank = rank - 5000;
    let maxRank = rank + 100000;

    if (rank < 5000) {
        minRank = 0;
    }

    new_data_of_student.minRank = minRank;
    new_data_of_student.maxRank = maxRank;
}


function clear_new_data_function() {
    new_data_of_student.caste_name = '';
    new_data_of_student.caste_Column_H = '';
    new_data_of_student.caste_Column_S = '';
    new_data_of_student.caste_Column_O = '';
    new_data_of_student.specialReservation = '';
}

function getCasteColumns(caste, gender) {

    const prefix = gender === 'Female' ? 'L' : 'G';

    new_data_of_student.caste_Column_H = `r.${prefix}${caste}H`;
    new_data_of_student.caste_Column_O = `r.${prefix}${caste}O`;
    new_data_of_student.caste_Column_S = `r.${prefix}${caste}S`;
    new_data_of_student.caste_name = `${prefix}${caste}`;

    if(caste === 'EWS'){
        new_data_of_student.caste_Column_H = `r.${caste}`;
        new_data_of_student.caste_Column_H = `r.${caste}`;
        new_data_of_student.caste_Column_H = `r.${caste}`;
        new_data_of_student.caste_name = `${caste}`;
    }
}

function customRound(value) {
    if (value >= 99.6) return 100;
    const intPart = Math.floor(value);
    const decimal = value - intPart;

    if (decimal > 0 && decimal <= 0.4) {
        return intPart + 0.5;
    } else if (decimal > 0.4) {
        return intPart + 1;
    } else {
        return value;   
    }
}


async function getRankFromPercentile(percentile) {
    const roundedPercentile = customRound(percentile);
    // console.log(roundedPercentile);
    try {
        const { data, error } = await supabase
            .from('pharmacy_percentile_to_rank')
            .select('Rank')
            .eq('percentile', roundedPercentile)
            .single();
        
        if (error) throw error;
        return data.Rank;
    } catch (error) {
        console.error('Error fetching rank:', error);
        throw error;
    }
}


async function getColleges(formData) {
    formData.homeUniversity = formData.homeuniversity;
    let caste_column = '';
    let caste_condition = '';

    // EWS
    if (formData.caste == 'EWS') {
        caste_column += `
            r.EWS || ' (' || COALESCE((SELECT m.percentile FROM pharmacy_merit_list AS m WHERE m."Rank" = r.EWS LIMIT 1), '0') || ')' AS ews,
        `;
        caste_condition += `
            (r.EWS BETWEEN ${new_data_of_student.minRank} AND ${new_data_of_student.maxRank} OR r.EWS = 0)
            AND
        `;
    }else{
        caste_column += `
            NULL::TEXT AS ews,
        `;
        caste_condition += `
            TRUE AND
        `;
    }
    
    // LOPEN
    if (formData.gender == 'Female') {
        caste_column += `
                CASE
                    WHEN r.LOPENS <> 0 AND r.LOPENH = 0 THEN r.LOPENS::TEXT
                    ELSE r.LOPENH::TEXT
                END || ' (' || COALESCE(
                            (SELECT m.percentile 
                            FROM pharmacy_merit_list AS m 
                            WHERE m."Rank" = 
                                CASE
                                    WHEN r.LOPENS <> 0 AND r.LOPENH = 0 THEN r.LOPENS
                                    ELSE r.LOPENH
                                END
                            LIMIT 1), '0'
                        ) || ')' AS LOPEN,
        `;

        caste_condition += `
            (
                CASE 
                    WHEN r.LOPENS <> 0 AND r.LOPENH = 0 THEN r.LOPENS
                    ELSE r.LOPENH
                END BETWEEN ${new_data_of_student.minRank} AND ${new_data_of_student.maxRank}
                OR 
                CASE 
                    WHEN r.LOPENS <> 0 AND r.LOPENH = 0 THEN r.LOPENS
                    ELSE r.LOPENH
                END = 0
            ) AND
        `;
    }else{
        caste_column += `
            NULL::TEXT AS lopen,
        `;
        caste_condition += `
            TRUE AND
        `;
    } 

    // GOBC
    if (formData.caste == 'OBC' && formData.gender == 'Male') {
        caste_column += `
            CASE
                WHEN r.GOBCS <> 0 AND r.GOBCH = 0 THEN r.GOBCS::TEXT
                ELSE r.GOBCH::TEXT
            END || ' (' || COALESCE(
                        (SELECT m.percentile 
                         FROM pharmacy_merit_list AS m 
                         WHERE m."Rank" = 
                             CASE
                                 WHEN r.GOBCS <> 0 AND r.GOBCH = 0 THEN r.GOBCS
                                 ELSE r.GOBCH
                             END
                         LIMIT 1), '0'
                    ) || ')' AS gobc,
        `;

        caste_condition += `
            (
                CASE 
                    WHEN r.GOBCS <> 0  AND r.GOBCH = 0 THEN r.GOBCS
                    ELSE r.GOBCH
                END BETWEEN ${new_data_of_student.minRank} AND ${new_data_of_student.maxRank}
                OR 
                CASE 
                    WHEN r.GOBCS <> 0 AND r.GOBCH = 0 THEN r.GOBCS
                    ELSE r.GOBCH
                END = 0
            ) AND
        `;
    }else{
        caste_column += `
            NULL::TEXT AS gobc,
        `;
        caste_condition += `
            TRUE AND
        `;
    } 

    // LOBC
    if (formData.caste == 'OBC' && formData.gender == 'Female') {
        caste_column += `
            CASE
                WHEN r.LOBCS <> 0  AND r.LOBCH = 0 THEN r.LOBCS::TEXT
               
                ELSE r.LOBCH::TEXT
            END || ' (' || COALESCE(
                        (SELECT m.percentile 
                         FROM pharmacy_merit_list AS m 
                         WHERE m."Rank" = 
                             CASE
                                 WHEN r.LOBCS <> 0 AND r.LOBCH = 0 THEN r.LOBCS
                                 ELSE r.LOBCH
                             END
                         LIMIT 1), '0'
                    ) || ')' AS lobc,
        `;

        caste_condition += `
            (
                CASE 
                    WHEN r.LOBCS <> 0 AND r.LOBCH = 0 THEN r.LOBCS
                    ELSE r.LOBCH
                END BETWEEN ${new_data_of_student.minRank} AND ${new_data_of_student.maxRank}
                OR 
                CASE 
                    WHEN r.LOBCS <> 0 AND r.LOBCH = 0 THEN r.LOBCS
                    ELSE r.LOBCH
                END = 0
            ) AND
        `;
    }else{
        caste_column += `
            NULL::TEXT AS lobc,
        `;
        caste_condition += `
            TRUE AND
        `;
    } 

    // GSEBC
    if (formData.caste == 'SEBC' && formData.gender == 'Male') {
        caste_column += `
            CASE
                WHEN r.GSEBCS <> 0  AND r.GSEBCH = 0 THEN r.GSEBCS::TEXT
                ELSE r.GSEBCH::TEXT
            END || ' (' || COALESCE(
                        (SELECT m.percentile 
                         FROM pharmacy_merit_list AS m 
                         WHERE m."Rank" = 
                             CASE
                                 WHEN r.GSEBCS <> 0 AND r.GSEBCH = 0 THEN r.GSEBCS
                                 ELSE r.GSEBCH
                             END
                         LIMIT 1), '0'
                    ) || ')' AS GSEBC,
        `;

        caste_condition += `
            (
                CASE 
                    WHEN r.GSEBCS <> 0 AND r.GSEBCH = 0 THEN r.GSEBCS
                    ELSE r.GSEBCH
                END BETWEEN ${new_data_of_student.minRank} AND ${new_data_of_student.maxRank}
                OR 
                CASE 
                    WHEN r.GSEBCS <> 0  AND r.GSEBCH = 0 THEN r.GSEBCS
                    ELSE r.GSEBCH
                END = 0
            ) AND
        `;
    }else{
        caste_column += `
            NULL::TEXT AS gsebc,
        `;
        caste_condition += `
            TRUE AND
        `;
    }

    // LSEBC 
    if (formData.caste == 'SEBC' && formData.gender == 'Female') {
        caste_column += `
            CASE
                WHEN r.LSEBCS <> 0 AND r.LSEBCH = 0 THEN r.LSEBCS::TEXT
                ELSE r.LSEBCH::TEXT
            END || ' (' || COALESCE(
                        (SELECT m.percentile 
                         FROM pharmacy_merit_list AS m 
                         WHERE m."Rank" = 
                             CASE
                                 WHEN r.LSEBCS <> 0  AND r.LSEBCH = 0 THEN r.LSEBCS
                                 ELSE r.LSEBCH
                             END
                         LIMIT 1), '0'
                    ) || ')' AS LSEBC,
        `;

        caste_condition += `
            (
                CASE 
                    WHEN r.LSEBCS <> 0 AND r.LSEBCH = 0 THEN r.LSEBCS
                    ELSE r.LSEBCH
                END BETWEEN ${new_data_of_student.minRank} AND ${new_data_of_student.maxRank}
                OR 
                CASE 
                    WHEN r.LSEBCS <> 0 AND r.LSEBCH = 0 THEN r.LSEBCS
                    ELSE r.LSEBCH
                END = 0
            ) AND
        `;
    }else{
        caste_column += `
            NULL::TEXT AS lsebc,
        `;
        caste_condition += `
            TRUE AND
        `;
    }

    // GST
    if (formData.caste == 'ST' && formData.gender == 'Male') {
        caste_column += `
            CASE
                WHEN r.GSTS <> 0 AND r.GSTH = 0 THEN r.GSTS::TEXT
                ELSE r.GSTH::TEXT
            END || ' (' || COALESCE(
                        (SELECT m.percentile 
                         FROM pharmacy_merit_list AS m 
                         WHERE m."Rank" = 
                             CASE
                                 WHEN r.GSTS <> 0  AND r.GSTH = 0 THEN r.GSTS
                                 ELSE r.GSTH
                             END
                         LIMIT 1), '0'
                    ) || ')' AS GST,
        `;

        caste_condition += `
            (
                CASE 
                    WHEN r.GSTS <> 0 AND r.GSTH = 0 THEN r.GSTS
                    ELSE r.GSTH
                END BETWEEN ${new_data_of_student.minRank} AND ${new_data_of_student.maxRank}
                OR 
                CASE 
                    WHEN r.GSTS <> 0 AND r.GSTH = 0 THEN r.GSTS
                    ELSE r.GSTH
                END = 0
            ) AND
        `;
    }else{
        caste_column += `
            NULL::TEXT AS gst,
        `;
        caste_condition += `
            TRUE AND
        `;
    }
    
    // LST
    if (formData.caste == 'ST' && formData.gender == 'Female') {
        caste_column += `
            CASE
                WHEN r.LSTS <> 0  AND r.LSTH = 0 THEN r.LSTS::TEXT
                ELSE r.LSTH::TEXT
            END || ' (' || COALESCE(
                        (SELECT m.percentile 
                         FROM pharmacy_merit_list AS m 
                         WHERE m."Rank" = 
                             CASE
                                 WHEN r.LSTS <> 0 AND r.LSTH = 0 THEN r.LSTS
                                 ELSE r.LSTH
                             END
                         LIMIT 1), '0'
                    ) || ')' AS LST,
        `;
        caste_condition += `
            (
                CASE 
                    WHEN r.LSTS <> 0 AND r.LSTH = 0 THEN r.LSTS
                    ELSE r.LSTH
                END BETWEEN ${new_data_of_student.minRank} AND ${new_data_of_student.maxRank}
                OR 
                CASE 
                    WHEN r.LSTS <> 0  AND r.LSTH = 0 THEN r.LSTS
                    ELSE r.LSTH
                END = 0
            ) AND
        `;
    }else{
        caste_column += `
            NULL::TEXT AS lst,
        `;
        caste_condition += `
            TRUE AND
        `;
    }

    // GSC
    if (formData.caste == 'SC' && formData.gender == 'Male') {
        caste_column += `
            CASE
                WHEN r.GSCS <> 0 AND r.GSCO = 0 AND r.GSCH = 0 THEN r.GSCS::TEXT
                WHEN c.university = '${formData.homeUniversity}' THEN r.GSCH::TEXT
                ELSE r.GSCH::TEXT
            END || ' (' || COALESCE(
                        (SELECT m.percentile 
                         FROM pharmacy_merit_list AS m 
                         WHERE m."Rank" = 
                             CASE
                                 WHEN r.GSCS <> 0 AND r.GSCH = 0 THEN r.GSCS
                                 ELSE r.GSCH
                             END
                         LIMIT 1), '0'
                    ) || ')' AS GSC,
        `;

        caste_condition += `
            (
                CASE 
                    WHEN r.GSCS <> 0 AND r.GSCH = 0 THEN r.GSCS
                    ELSE r.GSCH
                END BETWEEN ${new_data_of_student.minRank} AND ${new_data_of_student.maxRank}
                OR 
                CASE 
                    WHEN r.GSCS <> 0 AND r.GSCH = 0 THEN r.GSCS
                    ELSE r.GSCH
                END = 0
            ) AND
        `;
    }else{
        caste_column += `
            NULL::TEXT AS gsc,
        `;
        caste_condition += `
            TRUE AND
        `;
    }

    // LSC
    if (formData.caste == 'SC' && formData.gender == 'Female') {
        caste_column += `
            CASE
                WHEN r.LSCS <> 0 AND r.LSCH = 0 THEN r.LSCS::TEXT
                ELSE r.LSCH::TEXT
            END || ' (' || COALESCE(
                        (SELECT m.percentile 
                         FROM pharmacy_merit_list AS m 
                         WHERE m."Rank" = 
                             CASE
                                 WHEN r.LSCS <> 0 AND r.LSCH = 0 THEN r.LSCS
                                 ELSE r.LSCH
                             END
                         LIMIT 1), '0'
                    ) || ')' AS LSC,
        `;

        caste_condition += `
            (
                CASE 
                    WHEN r.LSCS <> 0 AND r.LSCH = 0 THEN r.LSCS
                    ELSE r.LSCH
                END BETWEEN ${new_data_of_student.minRank} AND ${new_data_of_student.maxRank}
                OR 
                CASE 
                    WHEN r.LSCS <> 0 AND  r.LSCH = 0 THEN r.LSCS
                    ELSE r.LSCO
                END = 0
            ) AND
        `;
    }else{
        caste_column += `
            NULL::TEXT AS lsc,
        `;
        caste_condition += `
            TRUE AND
        `;
    }

    // GNT1
    if (formData.caste == 'NT1' && formData.gender == 'Male') {
        caste_column += `
            CASE
                WHEN r.GNT1S <> 0  AND r.GNT1H = 0 THEN r.GNT1S::TEXT
                ELSE r.GNT1H::TEXT
            END || ' (' || COALESCE(
                        (SELECT m.percentile 
                         FROM pharmacy_merit_list AS m 
                         WHERE m."Rank" = 
                             CASE
                                 WHEN r.GNT1S <> 0  AND r.GNT1H = 0 THEN r.GNT1S
                                 ELSE r.GNT1H
                             END
                         LIMIT 1), '0'
                    ) || ')' AS GNT1,
        `;

        caste_condition += `
            (
                CASE 
                    WHEN r.GNT1S <> 0 AND r.GNT1H = 0 THEN r.GNT1S
                    ELSE r.GNT1H
                END BETWEEN ${new_data_of_student.minRank} AND ${new_data_of_student.maxRank}
                OR 
                CASE 
                    WHEN r.GNT1S <> 0 AND r.GNT1H = 0 THEN r.GNT1S
                    ELSE r.GNT1H
                END = 0
            ) AND
        `;
    }else{
        caste_column += `
            NULL::TEXT AS gnt1,
        `;
        caste_condition += `
            TRUE AND
        `;
    }

    // LNT1
    if (formData.caste == 'NT1' && formData.gender == 'Female') {
        caste_column += `
            CASE
                WHEN r.LNT1S <> 0 AND r.LNT1H = 0 THEN r.LNT1S::TEXT
                ELSE r.LNT1H::TEXT
            END || ' (' || COALESCE(
                        (SELECT m.percentile 
                         FROM pharmacy_merit_list AS m 
                         WHERE m."Rank" = 
                             CASE
                                 WHEN r.LNT1S <> 0  AND r.LNT1H = 0 THEN r.LNT1S
                                 ELSE r.LNT1H
                             END
                         LIMIT 1), '0'
                    ) || ')' AS LNT1,
        `;
        caste_condition += `
            (
                CASE 
                    WHEN r.LNT1S <> 0 AND r.LNT1H = 0 THEN r.LNT1S
                    ELSE r.LNT1H
                END BETWEEN ${new_data_of_student.minRank} AND ${new_data_of_student.maxRank}
                OR 
                CASE 
                    WHEN r.LNT1S <> 0 AND r.LNT1H = 0 THEN r.LNT1S
                    ELSE r.LNT1H
                END = 0
            ) AND
        `;
    }else{
        caste_column += `
            NULL::TEXT AS lnt1,
        `;
        caste_condition += `
            TRUE AND
        `;
    }

    // GNT2
    if (formData.caste == 'NT2' && formData.gender == 'Male') {
        caste_column += `
            CASE
                WHEN r.GNT2S <> 0 AND r.GNT2H = 0 THEN r.GNT2S::TEXT
                ELSE r.GNT2H::TEXT
            END || ' (' || COALESCE(
                        (SELECT m.percentile 
                         FROM pharmacy_merit_list AS m 
                         WHERE m."Rank" = 
                             CASE
                                 WHEN r.GNT2S <> 0 AND r.GNT2H = 0 THEN r.GNT2S
                                 ELSE r.GNT2H
                             END
                         LIMIT 1), '0'
                    ) || ')' AS GNT2,
        `;

        caste_condition += `
            (
                CASE 
                    WHEN r.GNT2S <> 0  AND r.GNT2H = 0 THEN r.GNT2S
                    ELSE r.GNT2H
                END BETWEEN ${new_data_of_student.minRank} AND ${new_data_of_student.maxRank}
                OR 
                CASE 
                    WHEN r.GNT2S <> 0  AND r.GNT2H = 0 THEN r.GNT2S
                    ELSE r.GNT2H
                END = 0
            ) AND
        `;
    }else{
        caste_column += `
            NULL::TEXT AS gnt2,
        `;
        caste_condition += `
            TRUE AND
        `;
    }

    // LNT2
    if (formData.caste == 'NT2' && formData.gender == 'Female') {
        caste_column += `
            CASE
                WHEN r.LNT2S <> 0 AND r.LNT2H = 0 THEN r.LNT2S::TEXT
                ELSE r.LNT2H::TEXT
            END || ' (' || COALESCE(
                        (SELECT m.percentile 
                         FROM pharmacy_merit_list AS m 
                         WHERE m."Rank" = 
                             CASE
                                 WHEN r.LNT2S <> 0 AND r.LNT2H = 0 THEN r.LNT2S
                                 ELSE r.LNT2H
                             END
                         LIMIT 1), '0'
                    ) || ')' AS LNT2,
        `;

        caste_condition += `
            (
                CASE 
                    WHEN r.LNT2S <> 0  AND r.LNT2H = 0 THEN r.LNT2S
                    ELSE r.LNT2H
                END BETWEEN ${new_data_of_student.minRank} AND ${new_data_of_student.maxRank}
                OR 
                CASE 
                    WHEN r.LNT2S <> 0  AND r.LNT2H = 0 THEN r.LNT2S
                    ELSE r.LNT2H
                END = 0
            ) AND
        `;
    }else{
        caste_column += `
            NULL::TEXT AS lnt2,
        `;
        caste_condition += `
            TRUE AND
        `;
    }

    // GNT3
    if (formData.caste == 'NT3' && formData.gender == 'Male') {
        caste_column += `
            CASE
                WHEN r.GNT3S <> 0 AND r.GNT3H = 0 THEN r.GNT3S::TEXT
                ELSE r.GNT3H::TEXT
            END || ' (' || COALESCE(
                        (SELECT m.percentile 
                         FROM pharmacy_merit_list AS m 
                         WHERE m."Rank" = 
                             CASE
                                 WHEN r.GNT3S <> 0 AND r.GNT3H = 0 THEN r.GNT3S
                                 ELSE r.GNT3H
                             END
                         LIMIT 1), '0'
                    ) || ')' AS GNT3,
        `;

        caste_condition += `
            (
                CASE 
                    WHEN r.GNT3S <> 0 AND r.GNT3H = 0 THEN r.GNT3S
                    ELSE r.GNT3H
                END BETWEEN ${new_data_of_student.minRank} AND ${new_data_of_student.maxRank}
                OR 
                CASE 
                    WHEN r.GNT3S <> 0  AND r.GNT3H = 0 THEN r.GNT3S
                    ELSE r.GNT3H
                END = 0
            ) AND
        `;
    }else{
        caste_column += `
            NULL::TEXT AS gnt3,
        `;
        caste_condition += `
            TRUE AND
        `;
    }

    // LNT3
    if (formData.caste == 'NT3' && formData.gender == 'Female') {
        caste_column += `
            CASE
                WHEN r.LNT3S <> 0 AND r.LNT3H = 0 THEN r.LNT3S::TEXT
                ELSE r.LNT3H::TEXT
            END || ' (' || COALESCE(
                        (SELECT m.percentile 
                         FROM pharmacy_merit_list AS m 
                         WHERE m."Rank" = 
                             CASE
                                 WHEN r.LNT3S <> 0 AND r.LNT3H = 0 THEN r.LNT3S
                                 ELSE r.LNT3H
                             END
                         LIMIT 1), '0'
                    ) || ')' AS LNT3,
        `;

        caste_condition += `
            (
                CASE 
                    WHEN r.LNT3S <> 0  AND r.LNT3H = 0 THEN r.LNT3S
                    ELSE r.LNT3H
                END BETWEEN ${new_data_of_student.minRank} AND ${new_data_of_student.maxRank}
                OR 
                CASE 
                    WHEN r.LNT3S <> 0 AND r.LNT3H = 0 THEN r.LNT3S
                    ELSE r.LNT3H
                END = 0
            ) AND
        `;
    }else{
        caste_column += `
            NULL::TEXT AS lnt3,
        `;
        caste_condition += `
            TRUE AND
        `;
    }

    // GVJ
    if (formData.caste == 'VJ' && formData.gender == 'Male') {
        caste_column += `
            CASE
                WHEN r.GVJS <> 0 AND r.GVJH = 0 THEN r.GVJS::TEXT
                ELSE r.GVJH::TEXT
            END || ' (' || COALESCE(
                        (SELECT m.percentile 
                         FROM pharmacy_merit_list AS m 
                         WHERE m."Rank" = 
                             CASE
                                 WHEN r.GVJS <> 0 AND r.GVJH = 0 THEN r.GVJS
                                 ELSE r.GVJH
                             END
                         LIMIT 1), '0'
                    ) || ')' AS GVJ,
        `;

        caste_condition += `
            (
                CASE 
                    WHEN r.GVJS <> 0 AND r.GVJH = 0 THEN r.GVJS
                    ELSE r.GVJH
                END BETWEEN ${new_data_of_student.minRank} AND ${new_data_of_student.maxRank}
                OR 
                CASE 
                    WHEN r.GVJS <> 0 AND r.GVJH = 0 THEN r.GVJS
                    ELSE r.GVJH
                END = 0
            ) AND
        `;
    }else{
        caste_column += `
            NULL::TEXT AS GVJ,
        `;
        caste_condition += `
            TRUE AND
        `;
    }

    // LVJ
    if (formData.caste == 'VJ' && formData.gender == 'Female') {
        caste_column += `
            CASE
                WHEN r.LVJS <> 0 AND r.LVJH = 0 THEN r.LVJS::TEXT
                ELSE r.LVJH::TEXT
            END || ' (' || COALESCE(
                        (SELECT m.percentile 
                         FROM pharmacy_merit_list AS m 
                         WHERE m."Rank" = 
                             CASE
                                 WHEN r.LVJS <> 0  AND r.LVJH = 0 THEN r.LVJS
                                 ELSE r.LVJH
                             END
                         LIMIT 1), '0'
                    ) || ')' AS LVJ,
        `;

        caste_condition += `
            (
                CASE 
                    WHEN r.LVJS <> 0  AND r.LVJH = 0 THEN r.LVJS
                    ELSE r.LVJH
                END BETWEEN ${new_data_of_student.minRank} AND ${new_data_of_student.maxRank}
                OR 
                CASE 
                    WHEN r.LVJS <> 0 AND r.LVJH = 0 THEN r.LVJS
                    ELSE r.LVJH
                END = 0
            ) AND
        `;
    }else{
        caste_column += `
            NULL::TEXT AS LVJ,
        `;
        caste_condition += `
            TRUE AND
        `;
    }

    // PWD
    if (formData.specialReservation == 'PWD') {
        // caste_column += `
        //     CASE
        //         WHEN r.PWDOPENS <> 0 AND r.PWDOPENH = 0 THEN r.PWDOPENS::TEXT
        //         ELSE r.PWDOPENH::TEXT
        //     END || ' (' || COALESCE(
        //                 (SELECT m.percentile 
        //                 pharmacy_merit_list AS m WHERE m."Rank" = 
        //                      CASE
        //                          WHEN r.PWDOPENS <> 0 AND r.PWDOPENH = 0 THEN r.PWDOPENS
        //                          ELSE r.PWDOPENH
        //                      END
        //                  LIMIT 1), '0'
        //             ) || ')' AS pwd,
        // `;

        caste_column += `
            CASE
                WHEN r.PWDOPENS <> 0 AND r.PWDOPENH = 0 THEN r.PWDOPENS::TEXT
                ELSE r.PWDOPENH::TEXT
            END || ' (' || COALESCE(
                        (SELECT m.percentile 
                         FROM pharmacy_merit_list AS m 
                         WHERE m."Rank" = 
                             CASE
                                 WHEN r.PWDOPENS <> 0 AND r.PWDOPENH = 0 THEN r.PWDOPENS
                                 ELSE r.PWDOPENH
                             END
                         LIMIT 1), '0'
                    ) || ')' AS pwd,
        `;

        // caste_condition += `
        //     (
        //         (r.PWDOPENS BETWEEN ${new_data_of_student.minRank} AND ${new_data_of_student.maxRank} OR r.PWDOPENS = 0)
        //         OR (r.PWDOPENH BETWEEN ${new_data_of_student.minRank} AND ${new_data_of_student.maxRank} OR r.PWDOPENH = 0)  
        //     )
        //     AND 
        // `;

        caste_condition += `
            (
                CASE 
                    WHEN r.PWDOPENS <> 0 AND r.PWDOPENH = 0 THEN r.PWDOPENS
                    ELSE r.PWDOPENH
                END BETWEEN ${new_data_of_student.minRank} AND ${new_data_of_student.maxRank}
                OR 
                CASE 
                    WHEN r.PWDOPENS <> 0 AND r.PWDOPENH = 0 THEN r.PWDOPENS
                    ELSE r.PWDOPENH
                END = 0
            ) AND
        `;

    } else{
        caste_column += `
            NULL::TEXT AS pwd,
        `;
        caste_condition += `
            TRUE AND
        `;
    }
    
    // DEF
    if (formData.specialReservation == 'DEF') {
        caste_column += `
            r.DEFOPENS || ' (' || COALESCE((SELECT m.percentile FROM pharmacy_merit_list AS m WHERE m."Rank" = r.DEFOPENS LIMIT 1), '0') || ')' AS def,
        `;

        caste_condition += `
            (r.DEFOPENS BETWEEN ${new_data_of_student.minRank} AND ${new_data_of_student.maxRank} OR r.DEFOPENS = 0)
            AND
        `;
    }else{
        caste_column += `
            NULL::TEXT AS def,
        `;
        caste_condition += `
            TRUE AND
        `;
    }

    // ORPHAN
    if (formData.specialReservation == 'ORPHAN') {
        caste_column += `
            r.ORPHAN || ' (' || COALESCE((SELECT m.percentile FROM pharmacy_merit_list AS m WHERE m."Rank" = r.ORPHAN LIMIT 1), '0') || ')' AS orphan,
        `;
        caste_condition += `
            (r.ORPHAN BETWEEN ${new_data_of_student.minRank} AND ${new_data_of_student.maxRank} OR r.ORPHAN = 0)
            AND
        `;
    }else{
        caste_column += `
            NULL::TEXT AS orphan,
        `;
        caste_condition += `
            TRUE AND
        `;
    }

    // let table_name = `cap_${formData.round}`;

    // console.log("Generated SQL:", caste_column);
    // console.log("caste condition", caste_condition);
    try {
        const { data, error } = await supabase.rpc('get_branch_choices_pharmacy', {
                homeuniversity: formData.homeuniversity,
                minrank: new_data_of_student.minRank,
                maxrank: new_data_of_student.maxRank,
                caste_column: caste_column,
                caste_condition: caste_condition
            });
        
        if(error){
            console.log(error);
        }else{
            
            // console.log(data);
            let colleges =  college_filter(data, formData);
            colleges.sort((a, b) => b.choice_points - a.choice_points);
            
            // console.log(colleges);
            return colleges;
        }
               
    } catch (err) {
        console.error('Server error:', err);
        res.status(500).json({ 
            error: 'Internal server error',
            message: err.message 
        });
    }
}

function college_filter(colleges, formData){

    if(formData.city[0] != 'All'){
        colleges = college_filter_by_city(colleges, formData.city);
    }

    // console.log(colleges);

    if(formData.branchCategories[0] !== 'All'){
        colleges = college_filter_by_branch_category(colleges,formData.branchCategories);
    }
    // console.log(colleges);
    let college_list = [];

    colleges.forEach(element => {
        if(formData.gender == 'Female'){
            if(element.gopen !== '0 (0)' || element.lopen !== '0 (0)'){
            
                college_list.push(element);
            }
        }else{
            if(element.gopen !== '0 (0)'){
                if(element.Branch_type != 'F'){
                    college_list.push(element);
                }
            }
        }
    });

    return college_list;
};


function college_filter_by_city(colleges, city){
    return colleges.filter(element =>  city.includes(element.city));
}


function college_filter_by_branch_category(colleges, branch_cat){
    return colleges.filter(element => branch_cat.includes(element.branch_name));
}


router.post('/College_list', async(req,res)=>{
    const formData = req.body;
    // console.log(formData);

    clear_new_data_function();

    try {
        
        const rank = await getRankFromPercentile(formData.generalRank);
        // console.log(rank);
        calculateRankRange(rank);
        
        getCasteColumns(formData.caste, formData.gender);
       
        // console.log(new_data_of_student);
        let colleges = await getColleges(formData);
        // console.log(colleges);
        // let amount = req.session.userPaymentInfo.amount;
            
        // if(amount == 499){
        //     colleges = colleges.slice(0, );
        //     colleges.sort((a, b) => b.choice_points - a.choice_points);
        // }else if(amount == 999){
        //     colleges = colleges.slice(0, 150);
        //     colleges.sort((a, b) => b.choice_points - a.choice_points);
        // }
        colleges = colleges.slice(0, 200);
        colleges.sort((a, b) => b.choice_points - a.choice_points);
        res.json(colleges);

    } catch (error) {
        console.log(error);
    }
});


module.exports = router;