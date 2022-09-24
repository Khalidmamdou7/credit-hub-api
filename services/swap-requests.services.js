const { getDriver } = require('../neo4j');

const getSwapRequests = async (user) => {
    const driver = getDriver();
    const session = driver.session();
    try {
        const res = await session.readTransaction(tx =>
            tx.run(
                `MATCH (u:User {userId: $userId})-[:REQUESTED]->(sr:SwapRequest)
                RETURN sr`,
                { userId: user.userId }
            )
        );
        return res.records.map(record => record.get('sr').properties);
    } finally {
        await session.close();
    }
}

const createSwapRequest = async (user, timeslot) => {
    const wantedTimeslots = timeslot.wantedTimeslots || [];
    const offeredTimeslots = timeslot.offeredTimeslots || [];
    const driver = getDriver();
    const session = driver.session();
    try {
        const res = await session.writeTransaction(tx =>
            tx.run(
                `MATCH (u:User {userId: $userId})
                MATCH (wantedTimeslots:Timeslot) WHERE wantedTimeslots.id IN $wantedTimeslots
                MATCH (offeredTimeslots:Timeslot) WHERE offeredTimeslots.id IN $offeredTimeslots
                CREATE (sr:SwapRequest 
                    {swapRequestId: randomUuid(), status: "pending"})
                CREATE (u)-[r:REQUESTED]->(sr)
                CREATE (sr)-[w:WANTS]->(wantedTimeslots)
                CREATE (sr)-[o:OFFERS]->(offeredTimeslots)
                RETURN sr, r, w, o`,
                { userId: user.userId, wantedTimeslots, offeredTimeslots }
            )
        );
        return res.records[0].get('sr').properties;
    } finally {
        await session.close();
    }
}



const updateSwapRequest = async (user, timeslotId, timeslot) => {
    const wantedTimeslots = timeslot.wantedTimeslots || [];
    const offeredTimeslots = timeslot.offeredTimeslots || [];
    const driver = getDriver();
    const session = driver.session();
    try {
        const res = await session.writeTransaction(tx =>
            tx.run(
                `MATCH (u:User {userId: $userId})-[:REQUESTED]->(sr:SwapRequest {swapRequestId: $swapRequestId})
                MATCH (wantedTimeslots:Timeslot) WHERE wantedTimeslots.id IN $wantedTimeslots
                MATCH (offeredTimeslots:Timeslot) WHERE offeredTimeslots.id IN $offeredTimeslots
                DELETE sr-[w:WANTS]->()
                DELETE sr-[o:OFFERS]->()
                CREATE (sr)-[w:WANTS]->(wantedTimeslots)
                CREATE (sr)-[o:OFFERS]->(offeredTimeslots)
                RETURN sr, w, o`,
                { userId: user.userId, swapRequestId: timeslotId, wantedTimeslots, offeredTimeslots }
            )
        );
        return res.records[0].get('sr').properties;
    }
    finally {
        await session.close();
    }
}

const deleteSwapRequest = async (user, swapRequestId) => {
    const driver = getDriver();
    const session = driver.session();
    try {
        const res = await session.writeTransaction(tx =>
            tx.run(
                `MATCH (u:User {userId: $userId})-[:REQUESTED]->(sr:SwapRequest {swapRequestId: $swapRequestId})
                DELETE sr`,
                { userId: user.userId, swapRequestId }
            )
        );
        return res.records[0].get('sr').properties;
    }
    finally {
        await session.close();
    }
}


module.exports = {
    getSwapRequests,
    createSwapRequest,
    updateSwapRequest,
    deleteSwapRequest
};