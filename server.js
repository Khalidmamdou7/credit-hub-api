const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const dotenv = require('dotenv');

dotenv.config();

app.use(bodyParser.json());


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));