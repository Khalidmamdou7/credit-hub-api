const NotFoundError = require('../errors/not-found.error');
const ValidationError = require('../errors/validation.error');
const { getDriver } = require('../neo4j');

const getSwapRequests = async (user) => {
    const driver = getDriver();
    const session = driver.session();
    try {
        // get all swap requests and their wanted and offered timeslots and the courses they belong to
        const res = await session.readTransaction(tx =>
            tx.run(
                `MATCH (u:User {userId: $userId})-[:REQUESTED]->(sr:SwapRequest)
                MATCH (sr)-[:WANTS]->(wt:Timeslot)
                MATCH (sr)-[:OFFERS]->(ot:Timeslot)
                MATCH (wt)<-[:OFFERED_AT]-(wc:Course)
                MATCH (ot)<-[:OFFERED_AT]-(oc:Course)
                RETURN sr, wt, ot, wc, oc`,
                { userId: user.userId }
        ));
        return res.records.map(record => {
            const sr = record.get('sr').properties;
            sr.wantedTimeslot = record.get('wt').properties;
            sr.offeredTimeslot = record.get('ot').properties;
            sr.wantedTimeslot.course = record.get('wc').properties;
            sr.offeredTimeslot.course = record.get('oc').properties;
            return sr;
        });
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
                    {swapRequestId: randomUuid(), status: "pending", createdAt: datetime(), updatedAt: datetime()})
                CREATE (u)-[r:REQUESTED]->(sr)
                CREATE (sr)-[w:WANTS]->(wantedTimeslots)
                CREATE (sr)-[o:OFFERS]->(offeredTimeslots)
                RETURN sr, r, w, o`,
                { userId: user.userId, wantedTimeslots, offeredTimeslots }
            )
        );
        
        if (res.records.length === 0) {
            throw new ValidationError('Invalid timeslots');
        }
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
                SET sr.updatedAt = datetime()
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
                DETACH DELETE sr RETURN sr`,
                { userId: user.userId, swapRequestId }
            )
        );
        if (res.records.length === 0) {
            throw new NotFoundError('Swap request not found');
        }
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