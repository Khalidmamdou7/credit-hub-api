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
                RETURN sr, wt, ot, wc, oc ORDER BY sr.createdAt DESC`,
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
    const offeredTimeslot = timeslot.offeredTimeslot || "";
    const driver = getDriver();
    const session = driver.session();
    try {
        // validate that the user is not trying to swap a timeslot with itself
        if (wantedTimeslots.includes(offeredTimeslot)) {
            throw new ValidationError('Cannot swap a timeslot with itself');
        }
        
        const res2 = await session.readTransaction(tx =>
            tx.run(
                `MATCH (t:Timeslot)
                WHERE t.id IN $wantedTimeslotIds
                RETURN t`,
                { wantedTimeslotIds: wantedTimeslots }
        ));
        if (res2.records.length !== wantedTimeslots.length) {
            throw new NotFoundError('One or more wanted timeslots not found');
        }
        // create the swap request
        const res3 = await session.writeTransaction(tx =>
            tx.run(
                `MATCH (u:User {userId: $userId})
                MATCH (ot:Timeslot)
                WHERE ot.id = $offeredTimeslotId
                CREATE (sr:SwapRequest 
                    {id: randomUUID(), status: 'pending', createdAt: datetime(), updatedAt: datetime()})
                CREATE (u)-[:REQUESTED]->(sr)
                CREATE (sr)-[:OFFERS]->(t)
                WITH sr
                MATCH (wt:Timeslot)
                WHERE wt.id IN $wantedTimeslotIds
                CREATE (sr)-[:WANTS]->(t)
                RETURN sr`,
                { userId: user.userId, offeredTimeslotId: offeredTimeslot , wantedTimeslotIds: wantedTimeslots }
        ));
        const sr = res3.records[0].get('sr').properties;
        return sr;
    }
    finally {
        await session.close();
    }
}

const updateSwapRequest = async (user, timeslotId, timeslot) => {
    const wantedTimeslots = timeslot.wantedTimeslots || [];
    const offeredTimeslot = timeslot.offeredTimeslot || "";
    const driver = getDriver();
    const session = driver.session();
    try {
        const res = await session.writeTransaction(tx =>
            tx.run(
                `MATCH (u:User {userId: $userId})-[:REQUESTED]->(sr:SwapRequest {swapRequestId: $swapRequestId})
                MATCH (wantedTimeslots:Timeslot) WHERE wantedTimeslots.id IN $wantedTimeslots
                MATCH (offeredTimeslot:Timeslot) WHERE offeredTimeslot.id = $offeredTimeslot
                SET sr.updatedAt = datetime()
                DELETE sr-[w:WANTS]->()
                DELETE sr-[o:OFFERS]->()
                CREATE (sr)-[w:WANTS]->(wantedTimeslots)
                CREATE (sr)-[o:OFFERS]->(offeredTimeslot)
                RETURN sr, w, o`,
                { userId: user.userId, swapRequestId: timeslotId, wantedTimeslots, offeredTimeslot }
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