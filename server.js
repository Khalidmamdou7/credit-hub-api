const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const passport = require('./passport/passport');
const { initDriver } = require('./neo4j');
const cors = require('cors');
const swaggerUI = require('swagger-ui-express');
const swaggerJsDoc = require('swagger-jsdoc');
const helmet = require('helmet');
const logger = require('./configs/logger');

const authRouter = require('./routes/auth');
const coursesRouter = require('./routes/courses.routes');
const swapRequestsRouter = require('./routes/swap-requests.routes');
const programsRouter = require('./routes/programs.routes');
const courseMapsRouter = require('./routes/course-maps.routes');
const scheduleRouter = require('./routes/schedule.routes');
const contactRouter = require('./routes/contact.routes');

const errorMiddleware = require('./middleware/error.middleware');

dotenv.config();


// Swagger
const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Credit Hub API',
            version: '2.0.0',
            description: 'The backend API for the Credit Hub application',
        },
        servers: [
            {
                url: 'http://localhost:5312/', 'description': 'Local server'
            },
            {
                url: 'https://' + process.env.DOMAIN + '/', 'description': 'Production server'
            }
        ],
    },
    apis: ['./routes/*.js'],
};

const specs = swaggerJsDoc(options);

app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(specs));

app.use(bodyParser.json());
app.use(passport.initialize());
app.use(cors({
    origin: '*'
}));
app.use(helmet());

// Connect to Neo4j and Verify Connectivity
const {
    NEO4J_URI,
    NEO4J_USERNAME,
    NEO4J_PASSWORD,
} = process.env
initDriver(NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD)

// Routes
app.get('/', (req, res) => {
    logger.info('Health check passed')
    res.send('I am alive!')
});

app.use('/api/auth', authRouter);
app.use('/api/courses', coursesRouter);
app.use('/api/swap-requests', swapRequestsRouter);
app.use('/api/programs', programsRouter);
app.use('/api/course-maps', courseMapsRouter);
app.use('/api/schedule', scheduleRouter);
app.use('/api/contact', contactRouter);

app.use(errorMiddleware);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    logger.info(`Server started on port ${PORT}, You can access the api documentation at http://localhost:${PORT}/api-docs`)
});