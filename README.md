# Swap-Courses-API

This is a simple API serving as a backend for a web application to swap courses between students.

It is written in Node.js and uses Express.js framework. It is connected to a [Neo4j](https://neo4j.com/) database (a Graph Database).

## Live Hosted Version

The API is hosted on Heroku and can be accessed [here](https://swap-courses-api.herokuapp.com/)

## API Documentation

The API documentation can be found [here](https://swap-courses-api.herokuapp.com/api-docs/)

## Features

-   User Authentication
-   CRUD operations for courses
-   Searching for courses
-   Creating and getting timeslots of courses for each semester

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