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

const authRouter = require('./routes/auth');
const coursesRouter = require('./routes/courses.routes');
const swapRequestsRouter = require('./routes/swap-requests.routes');
const programsRouter = require('./routes/programs.routes');
const courseMapsRouter = require('./routes/course-maps.routes');

const errorMiddleware = require('./middleware/error.middleware');

dotenv.config();

// Express status monitor config
const config = {
    title: 'API Status',
    path: '/status',
    spans: [
        {
            interval: 1,
            retention: 60,
        },
        {
            interval: 5,
            retention: 60,
        },
        {
            interval: 15,
            retention: 60,
        },
    ],
    chartVisibility: {
        cpu: true,
        mem: true,
        load: true,
        responseTime: true,
        rps: true,
        statusCodes: true,
    },
    healthChecks: [
        {
            protocol: 'http',
            host: process.env.DOMAIN,
            path: '/api/courses/search/c'
        },
    ],
};

app.use(require('express-status-monitor')(config));

// Swagger
const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Credit Hub API',
            version: '1.0.0',
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
app.get('/', passport.authenticate('jwt', {session: false}), async (req, res) => {
    console.log(req.user);
    res.send('Hello World!');
});

app.use('/api/auth', authRouter);
app.use('/api/courses', coursesRouter);
app.use('/api/swap-requests', swapRequestsRouter);
app.use('/api/programs', programsRouter);
app.use('/api/course-maps', courseMapsRouter);

app.use(errorMiddleware);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));