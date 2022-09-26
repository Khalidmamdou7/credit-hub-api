const NotFoundError = require('../errors/not-found.error');
const ValidationError = require('../errors/validation.error');
const { getDriver } = require('../neo4j');


const createSwapRequest = async (user, timeslot) => {
    const wantedTimeslots = timeslot.wantedTimeslots || [];
    const offeredTimeslot = timeslot.offeredTimeslot || "";
    const driver = getDriver();
    const session = driver.session();
    try {
        // validate that the user is not trying to swap a timeslot with itself
        if (wantedTimeslots.includes(offeredTimeslot)) {
            console.log('offeredTimeslot', offeredTimeslot);
            console.log('wantedTimeslots', wantedTimeslots);
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
            console.log('wantedTimeslots', wantedTimeslots);
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
                CREATE (sr)-[:OFFERS]->(ot)
                WITH sr, ot
                MATCH (wt:Timeslot)
                WHERE wt.id IN $wantedTimeslotIds
                CREATE (sr)-[:WANTS]->(wt)
                RETURN sr, ot, wt`,
                { userId: user.userId, offeredTimeslotId: offeredTimeslot , wantedTimeslotIds: wantedTimeslots }
        ));
        if (res3.records.length === 0) {
            console.log('offeredTimeslot', offeredTimeslot);
            throw new NotFoundError('Offered timeslot not found');
        }
        const sr = res3.records[0].get('sr').properties;
        return sr;
    }
    finally {
        await session.close();
    }
}

const getSwapRequests = async (user) => {
    const driver = getDriver();
    const session = driver.session();
    try {
        const res = await session.readTransaction(tx =>
            tx.run(
                `MATCH (u:User {userId: $userId})-[:REQUESTED]->(sr:SwapRequest)
                MATCH (sr)-[:OFFERS]->(ot:Timeslot)
                MATCH (sr)-[:WANTS]->(wt:Timeslot)
                RETURN sr, ot, wt`,
                { userId: user.userId }
        ));
        // for each swap request, get the offered and wanted timeslots. if there are duplicates swap requests,
        // then the offered and wanted timeslots will be duplicated as well. so we need to group them by swap request id
        const swapRequests = {};
        res.records.forEach(record => {
            const sr = record.get('sr').properties;
            const ot = record.get('ot').properties;
            const wt = record.get('wt').properties;
            if (!swapRequests[sr.id]) {
                swapRequests[sr.id] = {
                    ...sr,
                    offeredTimeslot: ot,
                    wantedTimeslots: [wt]
                };
            }
            else {
                swapRequests[sr.id].wantedTimeslots.push(wt);
            }
        });
        return Object.values(swapRequests);
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