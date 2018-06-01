const axios = require('axios');
require('dotenv').config();
function is_weekend(dt){
    if(dt.getDay() == 6 || dt.getDay() == 0) {
        return true;
    }
    return false;
}

if (!is_weekend(new Date())) {
    axios.get(`${process.env.APP_URL}/status`)
        .then(res => {
            console.log(res.data);
        })
        .catch(res => {
            console.error(res.toString());
        });
}