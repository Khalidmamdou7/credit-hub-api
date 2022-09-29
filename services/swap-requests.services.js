const NotFoundError = require('../errors/not-found.error');
const ValidationError = require('../errors/validation.error');
const { getDriver } = require('../neo4j');
const { sendMatchFoundEmail } = require('../utils/utils');


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

        const startTime = Date.now();

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

        const endTime = Date.now();
        console.log('createSwapRequest time taken :', endTime - startTime);

        if (res3.records.length === 0) {
            console.log('offeredTimeslot', offeredTimeslot);
            throw new NotFoundError('Offered timeslot not found');
        }
        const sr = res3.records[0].get('sr').properties;
        const ot = res3.records[0].get('ot').properties;
        const wt = res3.records[0].get('wt').properties;
        // check if the swap request matches any other swap requests
        const matches = await checkSwapRequestMatches(session, user, sr.id);
        sr.status = matches.length > 0 ? matches[0].status : sr.status;
        return {
            ...sr,
            offeredTimeslot: ot,
            wantedTimeslots: [wt],
            matches
        };
    }
    finally {
        await session.close();
    }
}

const checkSwapRequestMatches = async (dbSession, user, swapRequestId) => {
    
    const startTime = Date.now();

    const res = await dbSession.writeTransaction(tx =>
        tx.run(
            `MATCH (u:User {userId: $userId})-[:REQUESTED]->(sr:SwapRequest {id: $swapRequestId})
            MATCH (sr)-[:OFFERS]->(ot:Timeslot)
            MATCH (sr)-[:WANTS]->(wt:Timeslot)
            MATCH (sr2:SwapRequest)-[:OFFERS]->(wt)
            MATCH (sr2)-[:WANTS]->(ot)
            MATCH (sr2)<-[:REQUESTED]-(u2:User)
            WHERE sr2.status = 'pending'
            AND NOT (u)-[:REQUESTED]->(sr2)
            SET sr.status = 'waiting-for-agreement'
            SET sr2.status = 'waiting-for-agreement'
            CREATE (sr)-[:MATCHES {status: 'waiting-for-agreement'}]->(sr2)
            RETURN sr, sr2, u2`,
            { userId: user.userId, swapRequestId }
        )
    );
    const endTime = Date.now();
    console.log('checkSwapRequestMatches time taken :', endTime - startTime);
    
    return res.records.map(record => {
        const sr = record.get('sr').properties;
        const sr2 = record.get('sr2').properties;
        const u2 = record.get('u2').properties;
        sendMatchFoundEmail(u2.email);
        return {
            ...sr,
            matchedSwapRequest: sr2,
            matchedUser: u2.email
        };
    });
}

const getSwapRequests = async (user) => {
    const driver = getDriver();
    const session = driver.session();
    try {
        // if a swap request status is waiting-for-agreement, return the matching users too
        const res = await session.readTransaction(tx =>
            tx.run(
                `MATCH (u:User {userId: $userId})-[:REQUESTED]->(sr:SwapRequest)
                MATCH (sr)-[:OFFERS]->(ot:Timeslot)
                MATCH (sr)-[:WANTS]->(wt:Timeslot)
                OPTIONAL MATCH (sr)-[:MATCHES]-(sr2:SwapRequest)
                OPTIONAL MATCH (sr2)<-[:REQUESTED]-(u2:User)
                RETURN sr, ot, wt, sr2, u2`,
                { userId: user.userId }
        ));
        // for each swap request, get the offered and wanted timeslots. if there are duplicates swap requests,
        // then the offered and wanted timeslots will be duplicated as well. so we need to group them by swap request id
        const swapRequests = {};
        res.records.forEach(record => {
            const sr = record.get('sr').properties;
            const ot = record.get('ot').properties;
            const wt = record.get('wt').properties;
            const sr2 = record.get('sr2') ? record.get('sr2').properties : null;
            const u2 = record.get('u2') ? record.get('u2').properties : null;
            if (!swapRequests[sr.id]) {
                swapRequests[sr.id] = {
                    ...sr,
                    offeredTimeslot: ot,
                    wantedTimeslots: [wt],
                    matches: [{
                        ...sr2,
                        matchedUser: u2
                    }]
                };
            }
            else {
                if (!swapRequests[sr.id].wantedTimeslots.find(wt => wt.id === wt.id))
                    swapRequests[sr.id].wantedTimeslots.push(wt);
                if (sr2 && !swapRequests[sr.id].matches.find(m => m.id === sr2.id)) {
                    swapRequests[sr.id].matches.push({
                        ...sr2,
                        matchedUser: u2.email
                    });
                }
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
                `MATCH (u:User {userId: $userId})-[:REQUESTED]->(sr:SwapRequest {id: $swapRequestId})
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
        const sr = res.records[0].get('sr').properties;
        const w = res.records[0].get('w').properties;
        const o = res.records[0].get('o').properties;
        // check if the swap request matches any other swap requests
        const matches = await checkSwapRequestMatches(session, user, sr.id);
        sr.status = matches.length > 0 ? matches[0].status : sr.status;
        return {
            ...sr,
            offeredTimeslot: ot,
            wantedTimeslots: [wt],
            matches
        };
    }
    finally {
        await session.close();
    }
}

const agreeSwapRequest = async (user, swapRequestId, matchedSwapRequestId) => {
    const driver = getDriver();
    const session = driver.session();
    try {
        // Regarding the matched swap request SET the matches relationship status to 'agreed' only if both swap requests are in 'agreed' status
        // if there is a multiple matched swap requests, then the other matched swap requests will be deleted and set to 'pending'.
        const res = await session.writeTransaction(tx =>
            tx.run(
                `MATCH (u:User {userId: $userId})-[:REQUESTED]->(sr:SwapRequest {id: $swapRequestId})
                MATCH (sr)-[m1:MATCHES]-(sr2:SwapRequest {id: $matchedSwapRequestId})
                MATCH (sr)-[:OFFERS]->(ot:Timeslot)
                MATCH (sr)-[:WANTS]->(wt:Timeslot)
                MATCH (sr2)-[:OFFERS]->(ot2:Timeslot)
                MATCH (sr2)-[:WANTS]->(wt2:Timeslot)
                SET sr.status = 'agreed'
                SET m1.status = CASE WHEN sr2.status = 'agreed' THEN 'agreed' ELSE m1.status END
                WITH *
                MATCH (sr)-[m2:MATCHES]->(sr3:SwapRequest)
                WHERE sr3 <> sr2
                DELETE m2
                WITH *
                MATCH (sr3)-[m3:MATCHES]->(sr4:SwapRequest)
                WHERE sr4 <> sr
                SET sr4.status = CASE WHEN m3.status IS NULL THEN 'pending' ELSE sr3.status END
                RETURN sr, ot, wt, sr2, ot2, wt2, m1`,
                { userId: user.userId, swapRequestId, matchedSwapRequestId }
            )
        );

        if (res.records.length === 0) {
            throw new ValidationError('Swap request not found');
        }

        const sr = res.records[0].get('sr').properties;
        const ot = res.records[0].get('ot').properties;
        const wt = res.records[0].get('wt').properties;
        const sr2 = res.records[0].get('sr2').properties;
        const ot2 = res.records[0].get('ot2').properties;
        const wt2 = res.records[0].get('wt2').properties;
        const m1 = res.records[0].get('m1').properties;
        return {
            ...sr,
            offeredTimeslot: ot,
            wantedTimeslots: [wt],
            matchedSwapRequest: {
                ...sr2,
                offeredTimeslot: ot2,
                wantedTimeslots: [wt2],
                matches: m1
            }
        };
    }
    finally {
        await session.close();
    }
}

const deleteSwapRequest = async (user, swapRequestId) => {
    const driver = getDriver();
    const session = driver.session();
    try {
        // if a swap request status is waiting-for-agreement, set the status of the matching swap request to pending
        const res = await session.writeTransaction(tx =>
            tx.run(
                `MATCH (u:User {userId: $userId})-[:REQUESTED]->(sr:SwapRequest {id: $swapRequestId})
                MATCH (sr)-[m:MATCHES]-(sr2:SwapRequest)
                OPTIONAL MATCH (sr2)-[m2:MATCHES]-(sr3:SwapRequest)
                SET sr2.status = CASE WHEN m2 IS NULL THEN 'pending' ELSE sr2.status END
                DETACH DELETE sr`,
                { userId: user.userId, swapRequestId }
            )
        );
        return res.records.length > 0;
    }
    finally {
        await session.close();
    }
}

const disagreeToSwapRequest = async (user, swapRequestId, rejectedSwapRequestId) => {
    const driver = getDriver();
    const session = driver.session();
    try {
        const res = await session.writeTransaction(tx =>
            tx.run(
                `MATCH (u:User {userId: $userId})-[:REQUESTED]->(sr:SwapRequest {id: $swapRequestId})
                MATCH (sr)-[m:MATCHES]-(sr2:SwapRequest {id: $rejectedSwapRequestId})
                DELETE m
                SET sr.status = 'pending'
                WITH *
                OPTIONAL MATCH (sr2)-[m2:MATCHES]-(sr3:SwapRequest)
                SET sr2.status = CASE WHEN m2 IS NULL THEN 'pending' ELSE sr2.status END
                RETURN sr`,
                { userId: user.userId, swapRequestId, rejectedSwapRequestId }
            )
        );
        if (res.records.length === 0) {
            throw new ValidationError('Swap request not found');
        }
        const sr = res.records[0].get('sr').properties;
        const matches = await checkSwapRequestMatches(session, user, sr.id);
        sr.status = matches.length > 0 ? matches[0].status : sr.status;
        return sr;
    }
    finally {
        await session.close();
    }
}

const getSwapRequestsByCourse = async (courseCode) => {
    courseCode = courseCode.toUpperCase();
    const driver = getDriver();
    const session = driver.session();
    try {
        const res = await session.readTransaction(tx =>
            tx.run(
                `MATCH (sr:SwapRequest)-[:WANTS]-(wt:Timeslot)-[:OFFERED_AT]-(c:Course {code: $courseCode})
                MATCH (sr)-[:OFFERS]-(ot:Timeslot)
                MATCH (sr)-[:REQUESTED]-(u:User)
                WHERE sr.status = 'pending'
                RETURN sr, ot, wt, u`,
                { courseCode }
            )
        );
        return res.records.map(r => {
            const sr = r.get('sr').properties;
            const ot = r.get('ot').properties;
            const wt = r.get('wt').properties;
            const u = r.get('u').properties;
            return {
                ...sr,
                offeredTimeslot: ot,
                wantedTimeslots: [wt],
                user: u.email
            };
        });
    }
    finally {
        await session.close();
    }
}





module.exports = {
    getSwapRequests,
    createSwapRequest,
    updateSwapRequest,
    deleteSwapRequest,
    agreeSwapRequest,
    disagreeToSwapRequest,
    getSwapRequestsByCourse
};