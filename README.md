# Credit-Hub API

This is the API serving the backend for a web application to the Credit-Hub web application. The web application is a platform to help the students of the University of Cairo University, Faculty of Engineering, **Credit** Hour System in their daily college life. Its main features are:
 - **Course Swap** - A feature that allows students to find a match to swap their registered courses timeslots with other students.
 - **Absence Tool** - A feature that allows students to check whether they are going to be deprived of their right to attend a course due to exceeding the maximum number of absences allowed or not.
 - **Course Map** - A feature that allows students to create interactively a study plan for their upcoming semesters. (Waiting for the frontend to be completed.)

It is written in Node.js and uses Express.js framework. It is connected to a [Neo4j](https://neo4j.com/) database (a Graph Database).

## Live Hosted Version

The API is currently hosted [here](https://credithub.onrender.com/api-docs/)

## API Documentation

The API documentation can be found [here](https://credithub.onrender.com/api-docs/)

## Features

-   User Authentication
-   CRUD operations for courses
-   Searching for courses
-   Creating and getting timeslots of courses for each semester
-   Creating and getting course swaps
-   Getting information about a course like its creditHours, prerequisites and the semseters it is offered in (based on the historical data)

## Local Installation

To run the API locally, you need to have Node.js. You can download [Node.js](https://nodejs.org/en/download/). Once you have Node.js installed, you can clone the repository and install the dependencies.

```bash
git clone
cd swap-courses-api
npm install
```

## Running the API

To run the API, you need to have an instance of Neo4j running. You can create a free instance of Neo4j from [here](https://neo4j.com/developer/neo4j-cloud/). Once you have an instance of Neo4j running.

You need to create a `.env` file in the root directory of the project. You can use the `.env.example` file as a template. Once you have the `.env` file created, you can run the API.

```bash
npm start
```

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

[MIT](https://choosealicense.com/licenses/mit/)