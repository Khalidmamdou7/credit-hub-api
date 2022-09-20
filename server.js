const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const passport = require('./passport/passport');
const { initDriver } = require('./neo4j');
const authRouter = require('./routes/auth');
const coursesRouter = require('./routes/courses.routes');
const errorMiddleware = require('./middleware/error.middleware');

dotenv.config();

app.use(bodyParser.json());
app.use(passport.initialize());

// Connect to Neo4j and Verify Connectivity
const {
    NEO4J_URI,
    NEO4J_USERNAME,
    NEO4J_PASSWORD,
} = process.env
initDriver(NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD)

// Routes
app.get('/', passport.authenticate('jwt', {session: false}), async (req, res) => {
    console.log(req.user);
    res.send('Hello World!');
});

app.use('/api/auth', authRouter);
app.use('/api/courses', coursesRouter);

app.use(errorMiddleware);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));